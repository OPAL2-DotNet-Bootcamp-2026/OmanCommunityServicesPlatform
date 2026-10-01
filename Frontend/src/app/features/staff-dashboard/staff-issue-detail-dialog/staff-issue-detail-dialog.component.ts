import { Component, afterNextRender, computed, inject, input, output, signal, viewChild } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { errorMessage } from "../../../core/api/api-error";
import { SessionService } from "../../../core/auth/session.service";
import { type Comment } from "../../../core/models/comment.model";
import { type IssueStatus } from "../../../core/models/enums";
import { type StatusUpdate } from "../../../core/models/issue.model";
import { BusyButtonComponent } from "../../../shared/components/busy-button/busy-button.component";
import { IssueAttachmentsSectionComponent } from "../../../shared/components/issue-detail-sections/issue-attachments-section.component";
import { IssueCommentThreadComponent } from "../../../shared/components/issue-detail-sections/issue-comment-thread.component";
import { IssueDescriptionSectionComponent } from "../../../shared/components/issue-detail-sections/issue-description-section.component";
import { IssueLocationSectionComponent } from "../../../shared/components/issue-detail-sections/issue-location-section.component";
import { IssueTimelineSectionComponent } from "../../../shared/components/issue-detail-sections/issue-timeline-section.component";
import { BootstrapModalDirective } from "../../../shared/directives/bootstrap-modal.directive";
import { ToastService } from "../../../shared/services/toast.service";
import { type StaffIssueDetail, StaffDashboardService } from "../staff-dashboard.service";

/**
 * One issue in full for staff: details with coordinates, history, the status
 * change form (Open -> In Progress/Resolved, In Progress -> Resolved), the
 * citizen's rating once resolved, and public comments.
 */
@Component({
  selector: "ocsp-staff-issue-detail-dialog",
  imports: [
    ReactiveFormsModule, BootstrapModalDirective, BusyButtonComponent, IssueAttachmentsSectionComponent,
    IssueCommentThreadComponent, IssueDescriptionSectionComponent, IssueLocationSectionComponent, IssueTimelineSectionComponent
  ],
  templateUrl: "./staff-issue-detail-dialog.component.html"
})
export class StaffIssueDetailDialogComponent {
  readonly issue = input.required<StaffIssueDetail>();
  readonly closed = output<void>();
  /** The status changed; the page updates its card, counts and history. */
  readonly statusChanged = output<StatusUpdate>();

  private readonly service = inject(StaffDashboardService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly modal = viewChild.required(BootstrapModalDirective);

  /** An Open issue may move to either state; In Progress can only be resolved. */
  protected readonly nextStatuses = computed<{ value: IssueStatus; label: string }[]>(() =>
    this.issue().currentStatus === "Open"
      ? [{ value: "InProgress", label: "In Progress" }, { value: "Resolved", label: "Resolved" }]
      : [{ value: "Resolved", label: "Resolved" }]);
  protected readonly ratingStars = computed(() => {
    const score = Math.max(1, Math.min(5, Number(this.issue().rating?.score) || 0));
    return { score, stars: [1, 2, 3, 4, 5].map((value) => value <= score) };
  });

  protected readonly statusForm = new FormGroup({
    newStatus: new FormControl<IssueStatus>("Resolved", { nonNullable: true, validators: [Validators.required] }),
    notes: new FormControl("", { nonNullable: true, validators: [Validators.maxLength(500)] })
  });
  protected readonly statusMessage = signal("");
  protected readonly statusSaving = signal(false);

  protected readonly comments = signal<Comment[]>([]);
  protected readonly commentInput = new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(1000)] });
  protected readonly commentStatus = signal("");
  protected readonly commentSending = signal(false);

  constructor() {
    afterNextRender(() => {
      this.comments.set(this.issue().comments);
      this.statusForm.controls.newStatus.setValue(this.nextStatuses()[0]?.value ?? "Resolved");
      this.modal().show();
    });
  }

  close(): void {
    this.modal().hide();
  }

  protected changeStatus(): void {
    if (this.statusSaving() || this.statusForm.invalid) return;
    const issueId = this.issue().issueId;
    const { newStatus, notes } = this.statusForm.getRawValue();
    this.statusSaving.set(true);
    this.statusMessage.set("Updating status...");

    this.service.changeStatus(issueId, { newStatus, notes }).subscribe({
      next: (raw) => {
        // The write succeeded: build the history row from the response, without a second request.
        this.statusChanged.emit({
          statusUpdateId: raw?.statusUpdateId ?? 0,
          issueId: Number(raw?.issueId ?? issueId),
          updatedById: raw?.updatedById ?? this.session.getUser()?.userId ?? 0,
          previousStatus: raw?.previousStatus ?? newStatus,
          newStatus: raw?.newStatus ?? newStatus,
          notes: raw?.notes === undefined ? (notes.trim() || null) : raw.notes,
          updatedAt: raw?.updatedAt ?? new Date().toISOString()
        });
        this.toast.success("The issue status was updated successfully.");
        this.statusSaving.set(false);
        this.close();
      },
      error: (error: unknown) => {
        const message = errorMessage(error, "The issue status could not be updated.");
        this.statusMessage.set(message);
        this.toast.error(message, { announce: false });
        this.statusSaving.set(false);
      }
    });
  }

  protected addComment(): void {
    const content = this.commentInput.value.trim();
    if (!content || this.commentSending()) return;
    const issueId = this.issue().issueId;
    const user = this.session.getUser();
    this.commentSending.set(true);
    this.commentInput.disable();
    this.commentStatus.set("Adding comment...");

    this.service.addComment(issueId, content).subscribe({
      next: (response) => {
        this.comments.update((comments) => [...comments, {
          commentId: response?.commentId ?? 0,
          issueId: response?.issueId ?? issueId,
          userId: response?.userId ?? user?.userId ?? 0,
          userName: response?.userName ?? user?.name ?? "Staff",
          content: response?.content ?? content,
          isStaffComment: response?.isStaffComment ?? true,
          commentDate: response?.commentDate ?? new Date().toISOString()
        }]);
        this.commentInput.reset();
        this.commentStatus.set("Comment added.");
        this.toast.success("Comment added.", { announce: false });
        this.finishComment();
      },
      error: (error: unknown) => {
        const message = errorMessage(error, "The comment could not be added.");
        this.commentStatus.set(message);
        this.toast.error(message, { announce: false });
        this.finishComment();
      }
    });
  }

  private finishComment(): void {
    this.commentSending.set(false);
    this.commentInput.enable();
  }
}
