import { DecimalPipe } from "@angular/common";
import { Component, computed, input } from "@angular/core";
import { type Issue } from "../../../../core/models/issue.model";
import { IssueLocationMapComponent } from "../../issue-location-map/issue-location-map.component";

/** The written location and its map. Staff also see the coordinates, which crews dispatch from. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the dialog CSS applies
  selector: "div[ocspIssueLocationSection]",
  imports: [DecimalPipe, IssueLocationMapComponent],
  host: { class: "mt-4" },
  templateUrl: "./issue-location-section.component.html",
  styleUrl: "./issue-location-section.component.css"
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
