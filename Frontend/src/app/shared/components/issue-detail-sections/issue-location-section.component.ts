import { DecimalPipe } from "@angular/common";
import { Component, computed, input } from "@angular/core";
import { type Issue } from "../../../core/models/issue.model";
import { IssueLocationMapComponent } from "../issue-location-map/issue-location-map.component";

/** The written location and its map. Staff also see the coordinates, which crews dispatch from. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the dialog CSS applies
  selector: "div[ocspIssueLocationSection]",
  imports: [DecimalPipe, IssueLocationMapComponent],
  host: { class: "mt-4" },
  template: `
    <span class="content-label">Location</span>
    <div class="location-value">
      <i class="bi bi-geo-alt-fill" aria-hidden="true"></i>
      <span>{{ issue().location }}</span>
    </div>
    <div ocspIssueLocationMap [latitude]="latitude()" [longitude]="longitude()" [label]="areaName()" [height]="mapHeight()"></div>
    @if (showCoordinates() && latitude() !== null && longitude() !== null) {
      <p class="text-muted small mt-2 mb-0">
        <i class="bi bi-pin-map me-1" aria-hidden="true"></i>Lat: {{ latitude() | number: "1.4-4" }}, Lng: {{ longitude() | number: "1.4-4" }}
      </p>
    }
  `
})
export class IssueLocationSectionComponent {
  readonly issue = input.required<Issue>();
  readonly showCoordinates = input(false);
  readonly mapHeight = input("260px");

  protected readonly latitude = computed(() => finiteOrNull(this.issue().latitude));
  protected readonly longitude = computed(() => finiteOrNull(this.issue().longitude));
  protected readonly areaName = computed(() => this.issue().ui.mapAreaName || this.issue().regionName || "Issue location");
}

function finiteOrNull(value: number | null): number | null {
  return value !== null && Number.isFinite(Number(value)) ? Number(value) : null;
}
