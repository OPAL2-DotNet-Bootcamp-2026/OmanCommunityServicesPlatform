import { Component, computed, input, output } from "@angular/core";
import { type Issue } from "../../../core/models/issue.model";
import { PriorityBadgeComponent } from "../../../shared/components/issue-badges/priority-badge.component";
import { StatusBadgeComponent } from "../../../shared/components/issue-badges/status-badge.component";
import { UrgentBadgeComponent } from "../../../shared/components/issue-badges/urgent-badge.component";
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
  template: `
    <div class="accordion-header">
      <a #trigger class="accordion-button collapsed" [id]="'staffIssueTrigger-' + issue().issueId" href="#"
        aria-haspopup="dialog" (click)="$event.preventDefault(); open.emit(trigger)">
        <div class="row align-items-center w-100 me-2 g-2 text-start">
          <div class="col-12 col-md-3 d-flex align-items-center gap-3">
            <span ocspIssuePhoto [issue]="issue()"></span>
            <div class="min-w-0">
              <h3 class="issue-title mb-0 fw-bold text-dark text-truncate">{{ issue().title }}</h3>
              <small class="text-muted">REQ-{{ issue().issueId }}</small>
            </div>
          </div>
          <div class="col-6 col-md-2 text-dark small">User ID: {{ issue().reportedById || "Unavailable" }}</div>
          <div class="col-12 col-md-3 text-muted small">
            <span class="fw-semibold text-dark">{{ issue().assignedDepartmentName || "Awaiting assignment" }}</span><br>
            <span class="text-secondary">{{ issue().categoryName || "Uncategorized" }} &bull; {{ issue().regionName || "Region unavailable" }}</span>
          </div>
          <div class="col-6 col-md-2 text-md-center d-flex justify-content-md-center gap-2 flex-wrap status-priority-group">
            <span ocspStatusBadge [status]="issue().currentStatus"></span>
            <span ocspPriorityBadge [priority]="issue().priority"></span>
            @if (issue().isUrgent) {
              <span ocspUrgentBadge></span>
            }
          </div>
          <time class="col-12 col-md-2 text-md-end text-muted issue-date" [attr.datetime]="issue().reportedDate || ''">
            {{ issue().reportedDate | apiDate }}
          </time>
        </div>
      </a>
    </div>
  `
})
export class StaffIssueCardComponent {
  readonly issue = input.required<Issue>();
  readonly open = output<HTMLElement>();
  protected readonly statusKey = computed(() => getStatusMeta(this.issue().currentStatus).key);
}
