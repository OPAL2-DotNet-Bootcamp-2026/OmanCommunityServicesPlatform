import { Component, afterNextRender, computed, inject, input, output, signal, viewChild } from "@angular/core";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { errorMessage } from "../../../core/api/api-error";
import { SessionService } from "../../../core/auth/session.service";
import { type Attachment } from "../../../core/models/attachment.model";
import { type Comment } from "../../../core/models/comment.model";
import { type IssueDetail } from "../../../core/models/issue.model";
import { type IssueStatus } from "../../../core/models/enums";
import { type Rating } from "../../../core/models/rating.model";
import { BusyButtonComponent } from "../../../shared/components/busy-button/busy-button.component";
import { IssueAttachmentsSectionComponent } from "../../../shared/components/issue-detail-sections/issue-attachments-section.component";
import { IssueCommentThreadComponent } from "../../../shared/components/issue-detail-sections/issue-comment-thread.component";
import { IssueDescriptionSectionComponent } from "../../../shared/components/issue-detail-sections/issue-description-section.component";
import { IssueLocationSectionComponent } from "../../../shared/components/issue-detail-sections/issue-location-section.component";
import { IssueTimelineSectionComponent } from "../../../shared/components/issue-detail-sections/issue-timeline-section.component";
import { BootstrapModalDirective } from "../../../shared/directives/bootstrap-modal.directive";
import { ToastService } from "../../../shared/services/toast.service";
import { getStatusMeta } from "../../../shared/utils/issue-display.util";
import { isHttpUrl } from "../../../shared/utils/url.util";
import { CitizenIssuesService, isMatchingImage } from "../citizen-issues.service";

/** What the page needs to know after the citizen saved an image from this dialog. */
export interface ImageSaved {
  issueId: number;
  attachment: Attachment;
  /** The attachments the save was based on, so the page can merge without refetching. */
  baseAttachments: Attachment[];
}

/** The status shown in a small line under a form inside the dialog. */
interface LineStatus {
  text: string;
  tone: "danger" | "warning" | "info" | "";
}

const OPEN_STATES: readonly IssueStatus[] = ["Open", "InProgress"];

/**
 * One of the citizen's issues in full: details, map, attachments, history,
 * comments, rating (once Resolved) and the image-update panel (while Open or
 * In Progress). Opens as soon as it is created; emits (closed) once hidden.
 */
@Component({
  selector: "ocsp-citizen-issue-detail-dialog",
  imports: [
    ReactiveFormsModule, BootstrapModalDirective, BusyButtonComponent, IssueAttachmentsSectionComponent,
    IssueCommentThreadComponent, IssueDescriptionSectionComponent, IssueLocationSectionComponent, IssueTimelineSectionComponent
  ],
  templateUrl: "./citizen-issue-detail-dialog.component.html"
})
export class CitizenIssueDetailDialogComponent {
  readonly issue = input.required<IssueDetail>();
  /** True while the page is retrying an image for this issue; updates wait for it. */
  readonly imageRetryRunning = input(false);

  readonly closed = output<void>();
  readonly imageSaved = output<ImageSaved>();
  /** The image save began or ended, so the page can hold back a retry meanwhile. */
  readonly imageUpdateBusy = output<boolean>();
  /** The issue turned out to be resolved; the page updates its card. */
  readonly statusChanged = output<{ issueId: number; status: IssueStatus }>();
  readonly ratingSaved = output<Rating>();

  private readonly service = inject(CitizenIssuesService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly modal = viewChild.required(BootstrapModalDirective);

  protected readonly comments = signal<Comment[]>([]);
  protected readonly commentInput = new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.maxLength(1000)] });
  protected readonly commentStatus = signal("");
  protected readonly commentSending = signal(false);

  protected readonly selectedScore = signal(0);
  protected readonly ratingId = signal<number | null>(null);
  protected readonly feedbackInput = new FormControl("", { nonNullable: true, validators: [Validators.maxLength(500)] });
  protected readonly ratingStatus = signal("");
  protected readonly ratingSaving = signal(false);

  protected readonly imagePanelOpen = signal(false);
  protected readonly imageUrlInput = new FormControl("", { nonNullable: true });
  protected readonly imageStatus = signal<LineStatus>({ text: "", tone: "" });
  protected readonly imageSaving = signal(false);
  protected readonly imageUrlInvalid = signal(false);

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly canUpdateImage = computed(() => OPEN_STATES.includes(this.issue().currentStatus) && this.issue().ui.imageUpdateAvailable !== false);
  protected readonly isResolved = computed(() => this.issue().currentStatus === "Resolved");
  protected readonly statusBanner = computed(() => {
    const ui = this.issue().ui;
    if (!ui.hasFreshUpdate || !ui.updateTitle) return null;
    const resolved = getStatusMeta(this.issue().currentStatus).key === "resolved";
    return { resolved, title: ui.updateTitle, message: ui.updateMessage || "The issue has a new municipal update." };
  });

  constructor() {
    afterNextRender(() => {
      const issue = this.issue();
      this.comments.set(issue.comments);
      this.selectedScore.set(Number(issue.rating?.score) || 0);
      this.ratingId.set(Number(issue.rating?.ratingId) || null);
      this.feedbackInput.setValue(issue.rating?.feedback ?? "");
      this.imageUrlInput.setValue(issue.ui.editableImageUrl ?? "");
      this.modal().show();
    });
  }

  close(): void {
    this.modal().hide();
  }

  protected toggleImagePanel(): void {
    this.imagePanelOpen.update((open) => !open);
    this.imageStatus.set({ text: "", tone: "" });
  }

  protected addComment(): void {
    const content = this.commentInput.value.trim();
    if (!content || this.commentSending()) return;
    const issueId = this.issue().issueId;
    const user = this.session.getUser();
    this.commentStatus.set("Adding comment...");
    this.commentSending.set(true);
    this.commentInput.disable();

    this.service.addComment(issueId, content).subscribe({
      next: (response) => {
        // The write succeeded: show it from the response, never ask the citizen to post it twice.
        const comment: Comment = {
          commentId: response?.commentId ?? 0,
          issueId: response?.issueId ?? issueId,
          userId: response?.userId ?? user?.userId ?? 0,
          userName: response?.userName ?? user?.name ?? "Citizen",
          content: response?.content ?? content,
          isStaffComment: response?.isStaffComment ?? false,
          commentDate: response?.commentDate ?? new Date().toISOString()
        };
        this.comments.update((comments) => [...comments, comment]);
        this.commentInput.reset();
        this.commentStatus.set("Comment added.");
        this.toast.success("Comment added.", { announce: false });
        this.finishComment();
      },
      error: (error: unknown) => {
        this.commentStatus.set(errorMessage(error, "The comment could not be added."));
        this.finishComment();
      }
    });
  }

  protected submitRating(): void {
    const score = this.selectedScore();
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      this.ratingStatus.set("Choose a rating from 1 to 5 stars.");
      return;
    }
    const issueId = this.issue().issueId;
    const feedback = this.feedbackInput.value.trim();
    this.ratingSaving.set(true);
    this.ratingStatus.set(this.ratingId() ? "Updating feedback..." : "Saving feedback...");

    this.service.saveRating(this.ratingId(), issueId, score, feedback).subscribe({
      next: (response) => {
        const saved: Rating = {
          ratingId: response?.ratingId ?? this.ratingId() ?? 0,
          issueId: response?.issueId ?? issueId,
          userId: response?.userId ?? this.session.getUser()?.userId ?? 0,
          score: response?.score ?? score,
          feedback: response?.feedback ?? (feedback || null),
          ratedAt: response?.ratedAt ?? new Date().toISOString()
        };
        // Keeping the id makes a second submission an update, not a duplicate.
        this.ratingId.set(saved.ratingId || null);
        this.ratingSaved.emit(saved);
        this.ratingStatus.set("Thank you. Your feedback has been saved.");
        this.ratingSaving.set(false);
      },
      error: (error: unknown) => {
        this.ratingStatus.set(errorMessage(error, "The rating could not be saved."));
        this.ratingSaving.set(false);
      }
    });
  }

  /** Re-reads the issue first: it may have been resolved while the dialog sat open. */
  protected async saveImage(): Promise<void> {
    if (this.imageSaving()) return;
    const issue = this.issue();
    const imageUrl = this.imageUrlInput.value.trim();

    const warning = !OPEN_STATES.includes(issue.currentStatus)
      ? "Only Open or In Progress issues can update their image."
      : this.imageRetryRunning() ? "Wait for the current image retry to finish, then update the image." : "";
    if (warning) {
      this.imageStatus.set({ text: warning, tone: "warning" });
      this.toast.warning(warning, { announce: false });
      return;
    }
    if (!isHttpUrl(imageUrl)) {
      this.imageStatus.set({ text: "Enter an image URL beginning with http:// or https://.", tone: "danger" });
      this.imageUrlInvalid.set(true);
      return;
    }

    this.imageUrlInvalid.set(false);
    this.imageStatus.set({ text: "Checking the latest issue status...", tone: "info" });
    this.imageSaving.set(true);
    this.imageUpdateBusy.emit(true);
    try {
      const latest = await firstValueFrom(this.service.getIssueDetails(issue.issueId));
      if (!OPEN_STATES.includes(latest.currentStatus)) {
        this.statusChanged.emit({ issueId: issue.issueId, status: latest.currentStatus });
        this.toast.warning("This issue can no longer be updated because it is resolved.");
        this.close();
        return;
      }
      if (latest.warnings.includes("attachments")) {
        throw new Error("The current image could not be verified. Please try again.");
      }

      const userId = Number(this.session.getUser()?.userId);
      const exact = latest.attachments.find((attachment) => isMatchingImage(attachment, imageUrl));
      const owned = latest.attachments.find((attachment) =>
        String(attachment.fileType ?? "").toLowerCase() === "image" && Number(attachment.uploadedById) === userId);
      const saved = exact ?? await this.service.saveImageAttachment(issue.issueId, imageUrl,
        owned ? { attachmentId: owned.attachmentId } : { reconcileFirst: true });

      this.imageSaved.emit({ issueId: issue.issueId, attachment: saved, baseAttachments: latest.attachments });
      this.imageStatus.set({ text: "", tone: "" });
      this.toast.success(exact ? "The image URL is already up to date."
        : owned ? "The issue image was updated successfully." : "The issue image was added successfully.");
      this.close();
    } catch (error) {
      const message = errorMessage(error, "The issue image could not be updated.");
      this.imageStatus.set({ text: message, tone: "danger" });
      this.toast.error(message, { announce: false });
    } finally {
      this.imageSaving.set(false);
      this.imageUpdateBusy.emit(false);
    }
  }

  private finishComment(): void {
    this.commentSending.set(false);
    this.commentInput.enable();
  }
}
