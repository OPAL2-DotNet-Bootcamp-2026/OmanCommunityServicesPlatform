import {
  Component, ElementRef, type OnDestroy, afterNextRender, computed, effect, inject, input, output, untracked
} from "@angular/core";
import type * as Leaflet from "leaflet";

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_ZOOM = 15;
/** Muscat: the starting view when an issue has no coordinates. */
const FALLBACK_CENTRE: [number, number] = [23.588, 58.3829];

export interface MapPick {
  latitude: number;
  longitude: number;
}

/**
 * An OpenStreetMap map with the issue's pin (no API key needed):
 *   <div ocspIssueLocationMap [latitude]="lat" [longitude]="lng" label="Seeb"></div>
 * With [pickable]="true" a click moves the pin and emits (pick); changing the
 * inputs moves the pin too. Read-only with no coordinates shows a "no
 * coordinates" panel instead of a map of nowhere. Leaflet loads lazily.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the .issue-map CSS applies
  selector: "div[ocspIssueLocationMap]",
  host: {
    "[class.issue-map]": "true",
    "[class.issue-map--empty]": "showEmptyPanel()",
    "[style.height]": "showEmptyPanel() ? null : height()",
    "[attr.role]": "showEmptyPanel() ? 'img' : 'application'",
    "[attr.aria-label]": "ariaLabel()"
  },
  templateUrl: "./issue-location-map.component.html",
  styleUrl: "./issue-location-map.component.css"
})
export class IssueLocationMapComponent implements OnDestroy {
  readonly latitude = input<number | null>(null);
  readonly longitude = input<number | null>(null);
  /** Place name shown when there are no coordinates. */
  readonly label = input("Issue location");
  readonly pickable = input(false);
  readonly height = input("260px");
  readonly pick = output<MapPick>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private map: Leaflet.Map | null = null;
  private marker: Leaflet.Marker | null = null;
  private leaflet: typeof Leaflet | null = null;
  private resizeObserver: ResizeObserver | null = null;

  protected readonly hasCoordinates = computed(() => {
    const lat = this.latitude();
    const lng = this.longitude();
    return lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);
  });

  protected readonly showEmptyPanel = computed(() => !this.hasCoordinates() && !this.pickable());

  protected readonly ariaLabel = computed(() => {
    if (this.showEmptyPanel()) return `No coordinates for ${this.label()}`;
    return this.pickable() ? `Map for choosing a location. ${this.label()}` : `Map showing ${this.label()}`;
  });

  constructor() {
    afterNextRender(() => {
      if (!this.showEmptyPanel()) void this.mount();
    });
    // A new position from outside (e.g. "Use my current location") moves the pin.
    effect(() => {
      const lat = this.latitude();
      const lng = this.longitude();
      if (this.hasCoordinates() && lat !== null && lng !== null) {
        untracked(() => this.placePin(lat, lng));
      }
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private async mount(): Promise<void> {
    this.leaflet = await import("leaflet");
    const L = this.leaflet;
    const lat = this.latitude();
    const lng = this.longitude();
    const centre: [number, number] = this.hasCoordinates() && lat !== null && lng !== null ? [lat, lng] : FALLBACK_CENTRE;

    this.map = L.map(this.element, {
      center: centre,
      zoom: this.hasCoordinates() ? DEFAULT_ZOOM : 11,
      scrollWheelZoom: this.pickable()
    });
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(this.map);
    if (this.hasCoordinates()) this.placePin(centre[0], centre[1]);

    if (this.pickable()) {
      this.map.on("click", (event: Leaflet.LeafletMouseEvent) => {
        this.placePin(event.latlng.lat, event.latlng.lng);
        this.pick.emit({ latitude: event.latlng.lat, longitude: event.latlng.lng });
      });
    }

    // A map built inside a hidden dialog measures itself as zero; refit whenever its size changes.
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.element);
  }

  private placePin(lat: number, lng: number): void {
    const L = this.leaflet;
    if (!L || !this.map) return;
    // A divIcon, not Leaflet's PNG marker, whose CSS-relative URLs a bundler breaks.
    const icon = L.divIcon({
      className: "issue-map__pin",
      html: '<i class="bi bi-geo-alt-fill" aria-hidden="true"></i>',
      iconSize: [28, 28],
      iconAnchor: [14, 26]
    });
    if (this.marker) this.marker.setLatLng([lat, lng]);
    else this.marker = L.marker([lat, lng], { icon }).addTo(this.map);
    this.map.setView([lat, lng], Math.max(this.map.getZoom(), DEFAULT_ZOOM));
  }
}
