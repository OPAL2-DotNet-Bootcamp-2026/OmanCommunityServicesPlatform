import { Component, computed, input, output } from "@angular/core";
import { type Issue } from "../../../core/models/issue.model";
import { ApiDatePipe } from "../../pipes/api-date.pipe";
import { asAnnouncement, getStatusMeta } from "../../utils/issue-display.util";
import { PriorityBadgeComponent } from "../issue-badges/priority-badge/priority-badge.component";
import { StatusBadgeComponent } from "../issue-badges/status-badge/status-badge.component";
import { UrgentBadgeComponent } from "../issue-badges/urgent-badge/urgent-badge.component";
import { IssuePhotoComponent } from "../issue-photo/issue-photo.component";

/**
 * One issue in the citizen's list. Clicking it emits `open` with the button,
 * so focus can return there when the details dialog closes:
 *   <article ocspIssueCard [issue]="issue" (open)="showDetails(issue, $event)"></article>
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays an <article> so the gallery CSS applies
  selector: "article[ocspIssueCard]",
  imports: [ApiDatePipe, IssuePhotoComponent, PriorityBadgeComponent, StatusBadgeComponent, UrgentBadgeComponent],
  host: {
    "[class]": "cardClass()",
    "[attr.data-issue-id]": "issue().issueId"
  },
  templateUrl: "./issue-card.component.html",
  styleUrl: "./issue-card.component.css"
})
export class IssueCardComponent {
  readonly issue = input.required<Issue>();
  readonly open = output<HTMLElement>();

  protected readonly freshUpdateLabel = computed(() => String(this.issue().ui.freshUpdateLabel || "New update").trim() || "New update");

  protected readonly cardClass = computed(() => {
    const key = getStatusMeta(this.issue().currentStatus).key;
    const updated = this.issue().ui.hasFreshUpdate ? " is-updated" : "";
    return `ocsp-card ocsp-card--interactive issue-card issue-card--${key} issue-filter-item issue-filter-item--${key}${updated}`;
  });

  protected readonly ariaLabel = computed(() => {
    const title = String(this.issue().title || "Issue").trim() || "Issue";
    const fresh = this.issue().ui.hasFreshUpdate ? ` ${asAnnouncement(this.freshUpdateLabel())}` : "";
    return `View details for ${asAnnouncement(title)}${fresh}`;
  });
}
