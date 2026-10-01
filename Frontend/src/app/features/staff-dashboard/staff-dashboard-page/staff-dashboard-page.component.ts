import { Component, DestroyRef, type OnDestroy, type OnInit, computed, inject, signal, viewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { errorMessage } from "../../../core/api/api-error";
import { SessionService } from "../../../core/auth/session.service";
import { APP_CONFIG } from "../../../core/config/app-config.token";
import { type IssueStatus } from "../../../core/models/enums";
import { type Issue, type StatusUpdate } from "../../../core/models/issue.model";
import { type Category, type Department, type Region } from "../../../core/models/lookup.model";
import { AppPaths } from "../../../core/routing/app-paths";
import { parseApiDate } from "../../../core/utils/api-date.util";
import { type IssueFilters, emptyIssueFilters, filterIssues } from "../../../core/utils/issue-filter.util";
import { ActiveFiltersPanelComponent } from "../../../shared/components/issue-filters/active-filters-panel.component";
import { IssueFiltersDrawerComponent } from "../../../shared/components/issue-filters/issue-filters-drawer.component";
import { LoadingSkeletonComponent } from "../../../shared/components/loading-skeleton/loading-skeleton.component";
import { type StatusMessage, StatusAlertComponent } from "../../../shared/components/status-alert/status-alert.component";
import { CountUpDirective } from "../../../shared/directives/count-up.directive";
import { NearViewportDirective } from "../../../shared/directives/near-viewport.directive";
import { RevealOnEnterDirective } from "../../../shared/directives/reveal-on-enter.directive";
import { ToastService } from "../../../shared/services/toast.service";
import { PhotoLoadQueue, withPhotoAttachments } from "../../../shared/utils/issue-photo-loading.util";
import { calendarDay } from "../../notifications/notification-time.util";
import { NotificationsService } from "../../notifications/notifications.service";
import { AdminSetupDialogComponent } from "../admin-setup-dialog/admin-setup-dialog.component";
import { type StaffDashboardData, type StaffIssueDetail, StaffDashboardService } from "../staff-dashboard.service";
import { StaffIssueCardComponent } from "../staff-issue-card/staff-issue-card.component";
import { StaffIssueDetailDialogComponent } from "../staff-issue-detail-dialog/staff-issue-detail-dialog.component";

const STATUS_TILES: { id: string; status: IssueStatus | ""; key: string; label: string; icon: string }[] = [
  { id: "staffIssueFilterTotal", status: "", key: "total", label: "Total", icon: "bi-clipboard-data" },
  { id: "staffIssueFilterOpen", status: "Open", key: "open", label: "Open", icon: "bi-inbox" },
  { id: "staffIssueFilterProgress", status: "InProgress", key: "progress", label: "In Progress", icon: "bi-hourglass-split" },
  { id: "staffIssueFilterResolved", status: "Resolved", key: "resolved", label: "Resolved", icon: "bi-check-circle" }
];

/**
 * The staff and admin workspace: every issue with search and filters, the
 * issue dialog (status changes, staff comments) and, for Admins, platform
 * setup. The dialog is URL-driven (?issueId=), so Back and Forward open and
 * close it, and a notification link lands straight on the issue.
 */
@Component({
  selector: "ocsp-staff-dashboard-page",
  imports: [
    RouterLink, ActiveFiltersPanelComponent, IssueFiltersDrawerComponent, LoadingSkeletonComponent, StatusAlertComponent,
    CountUpDirective, NearViewportDirective, RevealOnEnterDirective, AdminSetupDialogComponent, StaffIssueCardComponent,
    StaffIssueDetailDialogComponent
  ],
  templateUrl: "./staff-dashboard-page.component.html"
})
export class StaffDashboardPageComponent implements OnInit, OnDestroy {
  private readonly service = inject(StaffDashboardService);
  private readonly notifications = inject(NotificationsService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly zone = inject(APP_CONFIG);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly paths = AppPaths;
  protected readonly statusTiles = STATUS_TILES;
  protected readonly isAdmin = computed(() => this.session.currentUser()?.role === "Admin");

  protected readonly data = signal<StaffDashboardData | null>(null);
  protected readonly issues = signal<Issue[]>([]);
  protected readonly statusUpdates = signal<StatusUpdate[]>([]);
  protected readonly regions = signal<Region[]>([]);
  protected readonly departments = signal<Department[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loadError = signal("");
  protected readonly pageStatus = signal<StatusMessage | null>(null);
  protected readonly filters = signal<IssueFilters>(emptyIssueFilters());
  protected readonly searchText = signal("");
  protected readonly detailIssue = signal<StaffIssueDetail | null>(null);

  private readonly detailDialog = viewChild(StaffIssueDetailDialogComponent);
  private readonly photoQueue = new PhotoLoadQueue();
  private searchTimer = 0;
  /** The issue being fetched for the dialog, so a repeated URL change does not fetch twice. */
  private loadingIssueId: number | null = null;

  protected readonly visibleIssues = computed(() => filterIssues(this.issues(), this.filters(), true));
  protected readonly counts = computed<Record<string, number>>(() => {
    const issues = this.issues();
    const count = (status: IssueStatus): number => issues.filter((issue) => issue.currentStatus === status).length;
    return { total: issues.length, open: count("Open"), progress: count("InProgress"), resolved: count("Resolved") };
  });
  protected readonly resolvedToday = computed(() => {
    const today = calendarDay(new Date(), this.zone);
    return this.statusUpdates().filter((update) =>
      update.newStatus === "Resolved" && calendarDay(parseApiDate(update.updatedAt), this.zone) === today).length;
  });
  protected readonly workload = computed(() => {
    const { total, open, progress } = this.counts();
    if (!total) return "There are no issues waiting for action.";
    if (!open && !progress) return "All issues are resolved.";
    const parts = [
      open ? `${open} open issue${open === 1 ? "" : "s"} need${open === 1 ? "s" : ""} triage` : "",
      progress ? `${progress} field task${progress === 1 ? " is" : "s are"} in progress` : ""
    ].filter(Boolean);
    return `${parts.join(" and ")}.`;
  });
  protected readonly departmentNames = computed(() => this.departments().map((item) => item.departmentName).sort((a, b) => a.localeCompare(b)));
  protected readonly categoryNames = computed(() => this.categories().map((item) => item.categoryName).sort((a, b) => a.localeCompare(b)));
  protected readonly activeFilterCount = computed(() =>
    (Object.keys(this.filters()) as (keyof IssueFilters)[]).filter((key) =>
      key === "sort" ? this.filters().sort !== "newest" : this.filters()[key].trim() !== "").length);

  ngOnInit(): void {
    this.load();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncDialogWithUrl());
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.searchTimer);
  }

  protected load(): void {
    this.loadError.set("");
    this.data.set(null);
    this.service.loadDashboard().subscribe({
      next: (data) => {
        this.data.set(data);
        this.issues.set(data.issues);
        this.statusUpdates.set(data.statusUpdates);
        this.regions.set(data.regions);
        this.departments.set(data.departments);
        this.categories.set(data.categories);
        this.notifications.unreadCount.set(data.notifications.filter((item) => !item.isRead).length);
        if (data.warnings.length) {
          this.pageStatus.set({ text: `Some supporting dashboard data could not be loaded: ${data.warnings.join(", ")}.`, tone: "warning" });
        }
        this.syncDialogWithUrl();
      },
      error: (error: unknown) => {
        const message = errorMessage(error, "The dashboard could not be loaded.");
        this.loadError.set(message);
        this.toast.error(message, { announce: false });
      }
    });
  }

  /* ---------- the URL-driven issue dialog ---------- */

  /** Opening adds ?issueId= (a Back entry); the URL change then loads the dialog. */
  protected openIssue(issueId: number): void {
    void this.router.navigate([], { queryParams: { issueId }, queryParamsHandling: "merge" });
  }

  /** The dialog closed itself (×, Escape, backdrop, or a status change): drop the id without a new history entry. */
  protected onDetailClosed(): void {
    const issueId = this.detailIssue()?.issueId;
    this.detailIssue.set(null);
    if (this.route.snapshot.queryParamMap.has("issueId")) {
      void this.router.navigate([], { queryParams: { issueId: null }, queryParamsHandling: "merge", replaceUrl: true });
    }
    if (issueId) {
      requestAnimationFrame(() => document.getElementById(`staffIssueTrigger-${issueId}`)?.focus());
    }
  }

  private syncDialogWithUrl(): void {
    if (!this.data()) return;
    const raw = this.route.snapshot.queryParamMap.get("issueId");
    const issueId = raw ? Number(raw) : null;
    const open = this.detailIssue();

    if (issueId === null) {
      // Back was pressed while the dialog was open.
      if (open) this.detailDialog()?.close();
      return;
    }
    if (open?.issueId === issueId || this.loadingIssueId === issueId) return;
    if (!Number.isInteger(issueId) || !this.issues().some((issue) => issue.issueId === issueId)) {
      this.pageStatus.set({ text: "The linked issue could not be found.", tone: "warning" });
      void this.router.navigate([], { queryParams: { issueId: null }, queryParamsHandling: "merge", replaceUrl: true });
      return;
    }
    void this.showDetails(issueId);
  }

  private async showDetails(issueId: number): Promise<void> {
    this.loadingIssueId = issueId;
    this.pageStatus.set(null);
    try {
      const issue = await firstValueFrom(this.service.getIssueDetails(issueId));
      // A navigation during the request makes the result stale.
      if (this.route.snapshot.queryParamMap.get("issueId") !== String(issueId)) return;
      if (!issue.warnings.includes("attachments")) {
        this.replaceIssue(issueId, (current) => withPhotoAttachments(current, issue.attachments));
      }
      this.detailIssue.set(issue);
    } catch (error) {
      this.pageStatus.set({ text: errorMessage(error, "The issue details could not be loaded."), tone: "danger" });
      void this.router.navigate([], { queryParams: { issueId: null }, queryParamsHandling: "merge", replaceUrl: true });
    } finally {
      this.loadingIssueId = null;
    }
  }

  /** Updates the local view from the write's response rather than a second request. */
  protected onStatusChanged(update: StatusUpdate): void {
    this.replaceIssue(update.issueId, (issue) => ({ ...issue, currentStatus: update.newStatus }));
    const id = Number(update.statusUpdateId);
    this.statusUpdates.update((updates) => [update, ...updates.filter((item) => !id || Number(item.statusUpdateId) !== id)]);
    this.pageStatus.set(null);
  }

  /* ---------- filters ---------- */

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

  protected loadPhoto(issue: Issue): void {
    if (issue.ui.attachmentsLoaded) return;
    void this.photoQueue.load(issue.issueId, () => firstValueFrom(this.service.getAttachments(issue.issueId)),
      (attachments) => this.replaceIssue(issue.issueId, (current) => withPhotoAttachments(current, attachments)));
  }

  private replaceIssue(issueId: number, change: (issue: Issue) => Issue): void {
    this.issues.update((issues) => issues.map((issue) => (issue.issueId === issueId ? change(issue) : issue)));
  }
}
