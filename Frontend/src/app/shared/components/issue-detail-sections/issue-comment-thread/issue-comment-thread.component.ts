import { Component, input } from "@angular/core";
import { type Comment } from "../../../../core/models/comment.model";
import { RevealOnEnterDirective } from "../../../directives/reveal-on-enter.directive";
import { ApiDatePipe } from "../../../pipes/api-date.pipe";
import { InitialsPipe } from "../../../pipes/initials.pipe";

/** The comments on an issue, citizen and staff alike, oldest first. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- stays a <div> so the dialog CSS applies
  selector: "div[ocspIssueCommentThread]",
  imports: [ApiDatePipe, InitialsPipe, RevealOnEnterDirective],
  host: { class: "comment-thread", role: "list", "aria-label": "Issue updates and comments" },
  templateUrl: "./issue-comment-thread.component.html",
  styleUrl: "./issue-comment-thread.component.css"
})
export class IssueCommentThreadComponent {
  readonly comments = input.required<Comment[]>();
  readonly emptyText = input("No comments yet. Add the first update below.");
}
