import { Component, type OnDestroy, type OnInit, computed, inject, signal, viewChild } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { errorMessage } from "../../../core/api/api-error";
import { SessionService } from "../../../core/auth/session.service";
import { type Attachment } from "../../../core/models/attachment.model";
import { type IssueStatus } from "../../../core/models/enums";
import { type Issue, type IssueDetail } from "../../../core/models/issue.model";
import { type Rating } from "../../../core/models/rating.model";
import { AppPaths } from "../../../core/routing/app-paths";
import { type IssueFilters, emptyIssueFilters, filterIssues } from "../../../core/utils/issue-filter.util";
import { IssueCardComponent } from "../../../shared/components/issue-card/issue-card.component";
import { ActiveFiltersPanelComponent } from "../../../shared/components/issue-filters/active-filters-panel/active-filters-panel.component";
import { IssueFiltersDrawerComponent } from "../../../shared/components/issue-filters/issue-filters-drawer/issue-filters-drawer.component";
import { LoadingSkeletonComponent } from "../../../shared/components/loading-skeleton/loading-skeleton.component";
import { type StatusMessage, StatusAlertComponent } from "../../../shared/components/status-alert/status-alert.component";
import { CountUpDirective } from "../../../shared/directives/count-up.directive";
import { NearViewportDirective } from "../../../shared/directives/near-viewport.directive";
import { RevealOnEnterDirective } from "../../../shared/directives/reveal-on-enter.directive";
import { ToastService } from "../../../shared/services/toast.service";
import { PhotoLoadQueue, withPhotoAttachments } from "../../../shared/utils/issue-photo-loading.util";
import { NotificationsService } from "../../notifications/notifications.service";
import { PaymentsService } from "../../payments/payments.service";
import { type CitizenIssuesData, CitizenIssuesService, isMatchingImage } from "../citizen-issues.service";
import { CitizenIssueDetailDialogComponent, type ImageSaved } from "../citizen-issue-detail-dialog/citizen-issue-detail-dialog.component";
import { type CreatedIssue, CreateIssueDialogComponent } from "../create-issue-dialog/create-issue-dialog.component";
import { ImageRetryQueueService } from "../image-retry-queue.service";

/** The stat tiles double as status filters. "" is the "all" tile. */
const STATUS_TILES: { id: string; status: IssueStatus | ""; key: string; label: string; icon: string }[] = [
  { id: "citizenIssueFilterTotal", status: "", key: "total", label: "Total Filed", icon: "bi-file-earmark-text" },
  { id: "citizenIssueFilterOpen", status: "Open", key: "open", label: "Open", icon: "bi-inbox" },
  { id: "citizenIssueFilterProgress", status: "InProgress", key: "progress", label: "In Progress", icon: "bi-hourglass-split" },
  { id: "citizenIssueFilterResolved", status: "Resolved", key: "resolved", label: "Resolved", icon: "bi-check-circle" }
];

/**
 * The citizen portal: their issues with search and filters, the create
 * dialog (including paid urgent handling), and the issue details dialog.
 */
@Component({
  selector: "ocsp-my-issues-page",
  imports: [
    RouterLink, IssueCardComponent, ActiveFiltersPanelComponent, IssueFiltersDrawerComponent, LoadingSkeletonComponent,
    StatusAlertComponent, CountUpDirective, NearViewportDirective, RevealOnEnterDirective,
    CitizenIssueDetailDialogComponent, CreateIssueDialogComponent
  ],
  templateUrl: "./my-issues-page.component.html",
  styleUrl: "./my-issues-page.component.css"
})
export class MyIssuesPageComponent implements OnInit, OnDestroy {
  private readonly service = inject(CitizenIssuesService);
  private readonly payments = inject(PaymentsService);
  private readonly notifications = inject(NotificationsService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly retryQueue = inject(ImageRetryQueueService);

  protected readonly paths = AppPaths;
  protected readonly statusTiles = STATUS_TILES;

  protected readonly data = signal<CitizenIssuesData | null>(null);
  protected readonly issues = signal<Issue[]>([]);
  protected readonly loadError = signal("");
  protected readonly pageStatus = signal<StatusMessage | null>(null);
  protected readonly filters = signal<IssueFilters>(emptyIssueFilters());
  protected readonly searchText = signal("");

  protected readonly detailIssue = signal<IssueDetail | null>(null);
  protected readonly createDialogOpen = signal(false);
  /** The issue whose image retry is running, so a second one cannot overlap. */
  protected readonly retryingIssueId = signal<number | null>(null);
  /** Issues whose image is being saved from the details dialog. */
  private readonly imageUpdatesRunning = signal<ReadonlySet<number>>(new Set());

  private readonly createDialog = viewChild.required(CreateIssueDialogComponent);
  private readonly pageStatusAlert = viewChild.required<StatusAlertComponent>("pageStatusAlert");
  private readonly photoQueue = new PhotoLoadQueue();
  private searchTimer = 0;
  /** The card button that opened the details dialog; focus returns there on close. */
  private detailTrigger: HTMLElement | null = null;

  protected readonly visibleIssues = computed(() => filterIssues(this.issues(), this.filters()));
  protected readonly counts = computed<Record<string, number>>(() => {
    const issues = this.issues();
    const count = (status: IssueStatus): number => issues.filter((issue) => issue.currentStatus === status).length;
    return { total: issues.length, open: count("Open"), progress: count("InProgress"), resolved: count("Resolved") };
  });
  /** Departments are whatever the citizen's own issues have been assigned to. */
  protected readonly departments = computed(() =>
    [...new Set(this.issues().map((issue) => issue.assignedDepartmentName).filter((name): name is string => Boolean(name)))]
      .sort((left, right) => left.localeCompare(right)));
  protected readonly categoryNames = computed(() => (this.data()?.categories ?? []).map((category) => category.categoryName));
  protected readonly activeFilterCount = computed(() =>
    (Object.keys(this.filters()) as (keyof IssueFilters)[]).filter((key) =>
      key === "sort" ? this.filters().sort !== "newest" : this.filters()[key].trim() !== "").length);
  protected readonly heroSummary = computed(() => {
    const { total, resolved } = this.counts();
    const active = total - (resolved ?? 0);
    if (!total) return "Your submitted reports will appear here.";
    return active ? `${active} report${active === 1 ? " is" : "s are"} awaiting or receiving municipal action.` : "All of your reports have been resolved.";
  });

  ngOnInit(): void {
    this.load();
    // The home page's "Create an Issue" links here with #createIssueModal.
    if (this.route.snapshot.fragment === "createIssueModal") {
      void this.router.navigate([], { fragment: undefined, queryParamsHandling: "preserve", replaceUrl: true });
      queueMicrotask(() => this.openCreateDialog());
    }
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.searchTimer);
  }

  protected load(): void {
    this.pageStatus.set(null);
    this.loadError.set("");
    this.data.set(null);
    this.service.loadMyIssues().subscribe({
      next: (data) => {
        this.data.set(data);
        this.issues.set(data.issues);
        this.notifications.unreadCount.set(data.notifications.filter((item) => !item.isRead).length);
        if (data.warnings.length) {
          this.pageStatus.set({ text: `Some supporting issue data could not be loaded: ${data.warnings.join(", ")}.`, tone: "warning" });
        }
        // Any retry saved in a previous visit, for issues this user still has.
        this.retryQueue.restore(new Set(data.issues.map((issue) => issue.issueId)));
        this.openLinkedIssue();
      },
      error: (error: unknown) => {
        const message = errorMessage(error, "The issue data could not be loaded.");
        this.loadError.set(message);
        this.toast.error(message, { announce: false });
      }
    });
  }

  protected openCreateDialog(): void {
    this.createDialog().open();
  }

  /* ---------- filters ---------- */

  /** Debounced so typing does not re-filter on every keystroke. */
  protected onSearch(value: string): void {
    this.searchText.set(value);
    window.clearTimeout(this.searchTimer);
    this.searchTimer = window.setTimeout(() => this.filters.update((filters) => ({ ...filters, search: value })), 150);
  }

  protected setStatusFilter(status: string): void {
    this.filters.update((filters) => ({ ...filters, status }));
  }

  protected removeFilter(key: keyof IssueFilters): void {
    if (key === "search") this.searchText.set("");
    this.filters.update((filters) => ({ ...filters, [key]: key === "sort" ? "newest" : "" }));
  }

  protected clearFilters(): void {
    window.clearTimeout(this.searchTimer);
    this.searchText.set("");
    this.filters.set(emptyIssueFilters());
  }

  /* ---------- card photos ---------- */

  protected loadPhoto(issue: Issue): void {
    if (issue.ui.attachmentsLoaded) return;
    void this.photoQueue.load(issue.issueId, () => firstValueFrom(this.service.getAttachments(issue.issueId)), (attachments) => {
      this.replaceIssue(issue.issueId, (current) => withPhotoAttachments(current, attachments));
      // If the image a retry was waiting for is already attached, the earlier request did commit.
      const pending = this.retryQueue.get(issue.issueId);
      if (pending && this.retryingIssueId() !== issue.issueId && attachments.some((item) => isMatchingImage(item, pending.imageUrl))) {
        this.retryQueue.remove(issue.issueId);
      }
    });
  }

  /* ---------- details dialog ---------- */

  protected async showDetails(issueId: number, trigger: HTMLElement | null): Promise<void> {
    this.pageStatus.set(null);
    this.detailTrigger = trigger;
    try {
      const issue = await firstValueFrom(this.service.getIssueDetails(issueId));
      // The image panel only makes sense when attachments loaded; it prefills with THIS user's image.
      const userId = Number(this.session.getUser()?.userId);
      const ownImage = issue.attachments.find((attachment) =>
        String(attachment.fileType ?? "").toLowerCase() === "image" && Number(attachment.uploadedById) === userId);
      this.detailIssue.set({
        ...issue,
        ui: { ...issue.ui, imageUpdateAvailable: !issue.warnings.includes("attachments"), editableImageUrl: ownImage?.fileUrl ?? "" }
      });
      this.clearFreshUpdate(issueId);
    } catch (error) {
      this.detailTrigger = null;
      this.pageStatus.set({ text: errorMessage(error, "The issue details could not be loaded."), tone: "danger" });
    }
  }

  protected onDetailClosed(): void {
    this.detailIssue.set(null);
    if (this.detailTrigger?.isConnected) this.detailTrigger.focus();
    this.detailTrigger = null;
  }

  protected isImageRetryRunning(issueId: number): boolean {
    return this.retryingIssueId() === issueId;
  }

  protected onImageUpdateBusy(issueId: number, busy: boolean): void {
    this.imageUpdatesRunning.update((running) => {
      const next = new Set(running);
      if (busy) next.add(issueId);
      else next.delete(issueId);
      return next;
    });
  }

  protected onImageSaved({ issueId, attachment, baseAttachments }: ImageSaved): void {
    this.mergeAttachment(issueId, attachment, baseAttachments);
    // A deliberate update supersedes an older create-time retry.
    this.retryQueue.remove(issueId);
  }

  protected onStatusChanged({ issueId, status }: { issueId: number; status: IssueStatus }): void {
    this.replaceIssue(issueId, (issue) => ({ ...issue, currentStatus: status }));
  }

  protected onRatingSaved(rating: Rating): void {
    this.replaceIssue(rating.issueId, (issue) => ({ ...issue, rating }));
  }

  /* ---------- creating ---------- */

  protected onIssueCreated(result: CreatedIssue): void {
    this.issues.update((issues) => [result.issue, ...issues]);
    if (result.attachmentFailed) {
      this.offerImageRetry(result.issue.issueId, result.imageUrl);
    } else {
      this.pageStatus.set({
        text: result.imageUrl ? "The issue and its image were added successfully." : "The issue was added successfully.",
        tone: "success"
      });
    }
    if (result.wantsUrgent) {
      void this.startUrgentCheckout(result.issue.issueId);
    }
  }

  /** Sends the citizen to Thawani's hosted page. The issue already exists, so a failure never undoes it. */
  private async startUrgentCheckout(issueId: number): Promise<void> {
    this.pageStatus.set({ text: "Issue submitted. Taking you to Thawani to pay...", tone: "info" });
    try {
      const { payUrl } = await firstValueFrom(this.payments.startCheckout(issueId));
      if (!payUrl.startsWith("https://")) {
        throw new Error("The payment page address is not valid.");
      }
      // assign(), not replace(): Back returns the citizen to My Issues.
      window.location.assign(payUrl);
    } catch (error) {
      const reason = errorMessage(error, "Please try again later.");
      const message = `Your issue was submitted normally, but the payment could not be started. ${reason}`;
      this.pageStatus.set({ text: message, tone: "warning" });
    }
  }

  /* ---------- image retry ---------- */

  protected async retryImage(issueId: number): Promise<void> {
    const pending = this.retryQueue.get(issueId);
    if (!pending || this.retryingIssueId() !== null || this.imageUpdatesRunning().has(issueId)) return;
    this.retryingIssueId.set(issueId);
    try {
      const attachment = await this.service.saveImageAttachment(issueId, pending.imageUrl, { reconcileFirst: true });
      this.mergeAttachment(issueId, attachment);
      // Only clear it if nothing replaced it while the request was in flight.
      if (this.retryQueue.get(issueId)?.imageUrl === pending.imageUrl) this.retryQueue.remove(issueId);
      this.pageStatus.set({ text: "The image was attached successfully.", tone: "success" });
      this.pageStatusAlert().focus();
    } catch {
      const issue = this.issues().find((item) => item.issueId === issueId);
      // The request failed, but the image may have landed anyway.
      if (issue?.attachments.some((item) => isMatchingImage(item, pending.imageUrl))) {
        this.retryQueue.remove(issueId);
        this.pageStatus.set({ text: "The image was attached successfully.", tone: "success" });
      } else {
        this.offerImageRetry(issueId, pending.imageUrl);
      }
    } finally {
      this.retryingIssueId.set(null);
    }
  }

  protected retryBlocked(issueId: number): boolean {
    return this.retryingIssueId() !== null || this.imageUpdatesRunning().has(issueId);
  }

  private offerImageRetry(issueId: number, imageUrl: string): void {
    this.retryQueue.add(issueId, imageUrl);
    this.toast.warning("The issue was created, but its image could not be attached. Use Retry image without creating another issue.",
      { announce: false, key: `attachment-retry-${issueId}` });
  }

  /* ---------- helpers ---------- */

  /** Opens the issue a notification linked to (?issueId=), then drops it from the URL so a refresh does not reopen it. */
  private openLinkedIssue(): void {
    const raw = this.route.snapshot.queryParamMap.get("issueId");
    if (!raw) return;
    void this.router.navigate([], { queryParams: { issueId: null }, queryParamsHandling: "merge", replaceUrl: true });
    const issueId = Number(raw);
    if (Number.isInteger(issueId) && issueId > 0 && this.issues().some((issue) => issue.issueId === issueId)) {
      void this.showDetails(issueId, null);
    } else {
      this.pageStatus.set({ text: "The linked issue could not be found.", tone: "warning" });
    }
  }

  /** Clears the "New update" ribbon once the issue is opened, and marks its notification read (best effort). */
  private clearFreshUpdate(issueId: number): void {
    const issue = this.issues().find((item) => item.issueId === issueId);
    if (!issue?.ui.hasFreshUpdate) return;
    const notificationId = Number(issue.ui.freshUpdateNotificationId);
    this.replaceIssue(issueId, (current) => ({ ...current, ui: { ...current.ui, hasFreshUpdate: false } }));
    if (Number.isInteger(notificationId) && notificationId > 0) {
      this.notifications.markRead(notificationId).subscribe({ error: () => undefined });
    }
  }

  private mergeAttachment(issueId: number, attachment: Attachment, base?: Attachment[]): void {
    this.replaceIssue(issueId, (issue) => {
      const others = (base ?? issue.attachments).filter((item) =>
        Number(item.attachmentId) !== Number(attachment.attachmentId) && item.fileUrl !== attachment.fileUrl);
      return withPhotoAttachments(issue, [attachment, ...others]);
    });
  }

  private replaceIssue(issueId: number, change: (issue: Issue) => Issue): void {
    this.issues.update((issues) => issues.map((issue) => (issue.issueId === issueId ? change(issue) : issue)));
  }
}
