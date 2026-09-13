/**
 * Real maps, replacing the CSS drawing that used to stand in for one.
 *
 * Split in two so the renderers stay pure:
 *   renderMapContainer() returns markup and nothing else
 *   mountMapsIn() is imperative and runs from the page after the markup is in
 *     the document, because Leaflet needs a real element with a real size
 *
 * Leaflet is a dynamic import, so only pages that actually show a map pay for
 * it, and its CSS rides along in the same chunk.
 *
 * OpenStreetMap tiles need no API key and no billing account.
 */
import { escapeHtml } from "./issue-renderers";

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_ZOOM = 15;

/** Muscat, used only as the starting view when an issue has no coordinates. */
const FALLBACK_CENTRE: [number, number] = [23.588, 58.3829];

/**
 * A data attribute is always a string, and an absent coordinate is "".
 * Number("") is 0 and Number.isFinite(0) is true, so a plain Number() check
 * silently puts the pin on Null Island off the coast of Africa.
 */
function parseCoordinate(value: string | undefined): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface MapContainerOptions {
  latitude: number | null;
  longitude: number | null;
  /** Place name shown when there are no coordinates to map. */
  label: string;
  /** Lets the user move the pin; the element emits ocsp:map-pick. */
  pickable?: boolean;
  height?: string;
}

/**
 * Pure. Emits the element mountMapsIn() later looks for.
 *
 * When there are no coordinates and the map is read-only there is nothing to
 * show, so it renders the same "unavailable" panel the page showed before
 * rather than an empty map of nowhere.
 */
export function renderMapContainer(options: MapContainerOptions): string {
  const hasCoordinates =
    typeof options.latitude === "number" &&
    typeof options.longitude === "number" &&
    Number.isFinite(options.latitude) &&
    Number.isFinite(options.longitude);

  if (!hasCoordinates && !options.pickable) {
    return `
      <div class="issue-map issue-map--empty" role="img" aria-label="No coordinates for ${escapeHtml(options.label)}">
        <i class="bi bi-map" aria-hidden="true"></i>
        <span>${escapeHtml(options.label)}</span>
        <small>Coordinates unavailable</small>
      </div>`;
  }

  return `
      <div
        class="issue-map"
        data-map
        data-lat="${hasCoordinates ? String(options.latitude) : ""}"
        data-lng="${hasCoordinates ? String(options.longitude) : ""}"
        data-label="${escapeHtml(options.label)}"
        data-pickable="${options.pickable ? "true" : "false"}"
        style="height: ${options.height ?? "260px"}"
        role="application"
        aria-label="${options.pickable ? `Map for choosing a location. ${escapeHtml(options.label)}` : `Map showing ${escapeHtml(options.label)}`}"
      ></div>`;
}

/** Detail of the ocsp:map-pick event a pickable map dispatches on itself. */
export interface MapPickDetail {
  latitude: number;
  longitude: number;
}

/** Lets a page move the pin on a map it has already mounted. */
const pinSetters = new WeakMap<HTMLElement, (latitude: number, longitude: number) => void>();

/**
 * Mounts every unmounted [data-map] under root. Safe to call repeatedly - each
 * element is marked once mounted, so a re-render does not stack maps.
 */
export async function mountMapsIn(root: ParentNode): Promise<void> {
  const containers = [...root.querySelectorAll<HTMLElement>("[data-map]")].filter(
    (element) => element.dataset.mapMounted !== "true"
  );
  if (!containers.length) {
    return;
  }

  const L = await import("leaflet");
  await import("leaflet/dist/leaflet.css");

  containers.forEach((container) => {
    container.dataset.mapMounted = "true";

    const latitude = parseCoordinate(container.dataset.lat);
    const longitude = parseCoordinate(container.dataset.lng);
    const hasCoordinates = latitude !== null && longitude !== null;
    const pickable = container.dataset.pickable === "true";
    const centre: [number, number] = hasCoordinates ? [latitude, longitude] : FALLBACK_CENTRE;


    const map = L.map(container, {
      center: centre,
      zoom: hasCoordinates ? DEFAULT_ZOOM : 11,
      scrollWheelZoom: pickable
    });

    L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    // A divIcon rather than Leaflet's default PNG marker: the default resolves
    // its icon URLs relative to the CSS, which a bundler rewrites and breaks.
    // This also matches the Bootstrap icons the rest of the site uses.
    const icon = L.divIcon({
      className: "issue-map__pin",
      html: '<i class="bi bi-geo-alt-fill" aria-hidden="true"></i>',
      iconSize: [28, 28],
      iconAnchor: [14, 26]
    });

    let marker = hasCoordinates ? L.marker(centre, { icon }).addTo(map) : null;

    const placePin = (lat: number, lng: number): void => {
      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng], { icon }).addTo(map);
      }
      map.setView([lat, lng], Math.max(map.getZoom(), DEFAULT_ZOOM));
    };
    pinSetters.set(container, placePin);

    if (pickable) {
      map.on("click", (event) => {
        const { lat, lng } = event.latlng;
        placePin(lat, lng);
        container.dispatchEvent(
          new CustomEvent<MapPickDetail>("ocsp:map-pick", {
            bubbles: true,
            detail: { latitude: lat, longitude: lng }
          })
        );
      });
    }

    // A map created inside a hidden or just-inserted element measures itself as
    // zero and renders one grey tile. Re-measuring once it is visible fixes it.
    requestAnimationFrame(() => map.invalidateSize());
    window.setTimeout(() => map.invalidateSize(), 250);
  });
}

/**
 * Moves the pin on an already-mounted map - used when the browser's geolocation
 * answers, so the button and the map agree. No-op if the map is not mounted yet.
 */
export function setMapPin(container: HTMLElement, latitude: number, longitude: number): void {
  container.dataset.lat = String(latitude);
  container.dataset.lng = String(longitude);
  pinSetters.get(container)?.(latitude, longitude);
}
