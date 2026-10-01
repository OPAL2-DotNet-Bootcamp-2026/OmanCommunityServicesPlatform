import { Component, computed, input } from "@angular/core";
import { type Issue } from "../../../core/models/issue.model";
import { ApiDatePipe } from "../../pipes/api-date.pipe";
import { RevealOnEnterDirective } from "../../directives/reveal-on-enter.directive";
import { buildIssueTimeline, getStatusMeta, isSubmissionEntry } from "../../utils/issue-display.util";

/** The issue's status history, starting with when it was submitted. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the dialog CSS applies
  selector: "div[ocspIssueTimelineSection]",
  imports: [ApiDatePipe, RevealOnEnterDirective],
  host: { class: "mt-4" },
  template: `
    <span class="content-label">Activity Timeline</span>
    @if (entries().length) {
      <ol class="activity-timeline" [class.activity-timeline--compact]="compact()">
        @for (entry of entries(); track $index) {
          <li class="timeline-item timeline-item--{{ entry.key }}" ocspReveal [revealIndex]="$index">
            <span class="timeline-dot" aria-hidden="true"></span>
            <div>
              <strong>{{ entry.label }}</strong>
              @if (entry.staffId) {
                <small>Changed by Staff ID: {{ entry.staffId }}</small>
              }
              @if (entry.notes) {
                <small>{{ entry.notes }}</small>
              }
              <small>{{ entry.updatedAt | apiDate: "dateTime" }}</small>
            </div>
          </li>
        }
      </ol>
    } @else {
      <p class="text-muted small mb-0">No status updates are available.</p>
    }
    @if (note()) {
      <p class="text-muted small mt-2 mb-0">{{ note() }}</p>
    }
  `
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
