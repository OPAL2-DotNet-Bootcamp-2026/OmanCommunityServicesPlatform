import { Component, computed, input } from "@angular/core";
import { type Issue } from "../../../../core/models/issue.model";
import { ApiDatePipe } from "../../../pipes/api-date.pipe";
import { RevealOnEnterDirective } from "../../../directives/reveal-on-enter.directive";
import { buildIssueTimeline, getStatusMeta, isSubmissionEntry } from "../../../utils/issue-display.util";

/** The issue's status history, starting with when it was submitted. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the dialog CSS applies
  selector: "div[ocspIssueTimelineSection]",
  imports: [ApiDatePipe, RevealOnEnterDirective],
  host: { class: "mt-4" },
  templateUrl: "./issue-timeline-section.component.html",
  styleUrl: "./issue-timeline-section.component.css"
})
export class IssueTimelineSectionComponent {
  readonly issue = input.required<Issue>();
  readonly compact = input(false);
  /** Shown under the timeline, e.g. when the backend withheld the detail. */
  readonly note = input("");

  protected readonly entries = computed(() => buildIssueTimeline(this.issue()).map((update) => {
    const submission = isSubmissionEntry(update);
    const label = submission ? "Issue Submitted" : getStatusMeta(update.newStatus).label;
    const notes = String(update.notes ?? "").trim();
    return {
      key: getStatusMeta(update.newStatus).key,
      label,
      staffId: !submission && update.updatedById ? update.updatedById : null,
      notes: !submission && notes && notes !== label ? notes : "",
      updatedAt: update.updatedAt
    };
  }));
}
