import { Component, input } from "@angular/core";
import { type Comment } from "../../../core/models/comment.model";
import { RevealOnEnterDirective } from "../../directives/reveal-on-enter.directive";
import { ApiDatePipe } from "../../pipes/api-date.pipe";
import { InitialsPipe } from "../../pipes/initials.pipe";

/** The comments on an issue, citizen and staff alike, oldest first. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the dialog CSS applies
  selector: "div[ocspIssueCommentThread]",
  imports: [ApiDatePipe, InitialsPipe, RevealOnEnterDirective],
  host: { class: "comment-thread", role: "list", "aria-label": "Issue updates and comments" },
  template: `
    @for (comment of comments(); track comment.commentId || $index) {
      <article class="ocsp-card comment-card" [class.comment-card--highlighted]="comment.highlighted" role="listitem" ocspReveal [revealIndex]="$index">
        <div class="comment-avatar comment-avatar--{{ comment.isStaffComment ? 'admin' : 'citizen' }}">{{ comment.userName | initials }}</div>
        <div class="comment-copy">
          <div class="comment-header">
            <div class="comment-author">
              <strong>{{ comment.userName || (comment.isStaffComment ? "Staff" : "Citizen") }}</strong>
              <span class="role-badge role-badge--{{ comment.isStaffComment ? 'admin' : 'citizen' }}">{{ comment.isStaffComment ? "Staff" : "Citizen" }}</span>
            </div>
            <time [attr.datetime]="comment.commentDate || ''">{{ comment.commentDate | apiDate: "dateTime" }}</time>
          </div>
          <p>{{ comment.content }}</p>
        </div>
      </article>
    } @empty {
      <p class="text-muted small mb-0">{{ emptyText() }}</p>
    }
  `
})
export class IssueCommentThreadComponent {
  readonly comments = input.required<Comment[]>();
  readonly emptyText = input("No comments yet. Add the first update below.");
}
