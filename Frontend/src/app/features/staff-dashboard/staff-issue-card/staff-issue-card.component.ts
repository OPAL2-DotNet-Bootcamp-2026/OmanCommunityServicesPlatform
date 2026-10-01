import { Component, computed, input, output } from "@angular/core";
import { type Issue } from "../../../core/models/issue.model";
import { PriorityBadgeComponent } from "../../../shared/components/issue-badges/priority-badge/priority-badge.component";
import { StatusBadgeComponent } from "../../../shared/components/issue-badges/status-badge/status-badge.component";
import { UrgentBadgeComponent } from "../../../shared/components/issue-badges/urgent-badge/urgent-badge.component";
import { IssuePhotoComponent } from "../../../shared/components/issue-photo/issue-photo.component";
import { ApiDatePipe } from "../../../shared/pipes/api-date.pipe";
import { getStatusMeta } from "../../../shared/utils/issue-display.util";

/**
 * One issue in the staff list: request number, reporter, department, category,
 * region, badges. Clicking it emits `open` with the trigger, for focus on close.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the accordion CSS applies
  selector: "div[ocspStaffIssueCard]",
  imports: [ApiDatePipe, IssuePhotoComponent, PriorityBadgeComponent, StatusBadgeComponent, UrgentBadgeComponent],
  host: {
    "[class]": "'accordion-item issue-card issue-card--' + statusKey() + ' issue-filter-item issue-filter-item--' + statusKey()",
    "[attr.data-issue-id]": "issue().issueId"
  },
  templateUrl: "./staff-issue-card.component.html",
  styleUrl: "./staff-issue-card.component.css"
})
export class StaffIssueCardComponent {
  readonly issue = input.required<Issue>();
  readonly open = output<HTMLElement>();
  protected readonly statusKey = computed(() => getStatusMeta(this.issue().currentStatus).key);
}
