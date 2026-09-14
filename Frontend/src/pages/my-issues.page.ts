/**
 * The citizen portal: issue list, filters, create-issue dialog, detail modal
 * with comments and ratings.
 */
import { announceStatus, byId, errorMessage, optionalById, setAlert, toTone } from "../dom";
import {
  escapeHtml,
  getInitials,
  getStatusMeta,
  renderComments,
  renderIssueCard,
  renderIssueDetailModal,
  safeDomId
} from "../components/issue-renderers";
import type {
  Attachment,
  Category,
  Comment,
  CreateIssueRequest,
  Issue,
  Rating
} from "../models";
import type { CitizenDashboardData, DataService } from "../services/data.service";
import type { SessionService } from "../services/session.service";
import { formString, normalizedSearch } from "../text";
import * as feedback from "../components/feedback";
import {
  renderSkeletons,
  revealList,
  revealWithin,
  setButtonBusy
} from "../components/motion";
import {
  IssueImageHydrator,
  applyAttachmentsToIssue,
  findIssueById,
  refreshIssueCardImage as refreshCardImage
} from "../components/issue-images";
import { mountMapsIn, setMapPin, type MapPickDetail } from "../components/map";
import { reverseGeocode } from "../services/geocoding.service";

type FilterKey = "search" | "status" | "priority" | "department" | "category" | "sort";
type Filters = Record<FilterKey, string>;

interface ActiveFilter {
  key: FilterKey;
  label: string;
  value: string;
}

interface MyIssuesElements {
  gallery: HTMLElement;
  detailHost: HTMLElement;
  resultSummary: HTMLElement | null;
  searchInput: HTMLInputElement;
  sortFilter: HTMLSelectElement;
  statusFilter: HTMLSelectElement;
  priorityFilter: HTMLSelectElement;
  departmentFilter: HTMLSelectElement;
  categoryFilter: HTMLSelectElement;
  activeFiltersPanel: HTMLElement | null;
  activeFilterChips: HTMLElement;
  activeFilterCount: HTMLElement | null;
  createIssueForm: HTMLFormElement;
  createIssueStatus: HTMLElement;
  issueCategory: HTMLSelectElement;
  issueRegion: HTMLSelectElement;
  issueLocation: HTMLInputElement;
  issueGovernorate: HTMLInputElement;
  issueLatitude: HTMLInputElement;
  issueLongitude: HTMLInputElement;
  locationButton: HTMLButtonElement;
  locationStatus: HTMLElement;
  pageStatus: HTMLElement;
  issueImageUrl: HTMLInputElement;
  attachmentRetryStatus: HTMLElement;
}

/** An image URL whose attachment could not be saved, kept so it can be retried. */
interface PendingAttachment {
  issueId: number;
  imageUrl: string;
}

/** Radio id to the status it filters by. "" is the "all" pill. */
const STATUS_RADIO_MAP: Record<string, string> = {
  citizenIssueFilterTotal: "",
  citizenIssueFilterOpen: "Open",
  citizenIssueFilterProgress: "InProgress",
  citizenIssueFilterResolved: "Resolved"
};

function emptyFilters(): Filters {
  return { search: "", status: "", priority: "", department: "", category: "", sort: "newest" };
}

export class MyIssuesPage {
  private elements!: MyIssuesElements;
  private dashboard: CitizenDashboardData | null = null;
  private filters: Filters = emptyFilters();
  private openIssueTrigger: HTMLElement | null = null;
  private searchTimer = 0;
  private imageHydrator: IssueImageHydrator | null = null;
  /** Image URLs whose attachment call failed, keyed by issue. */
  private readonly pendingAttachments = new Map<number, PendingAttachment>();
  /** Guards against two retries, or a retry racing a deliberate update. */
  private activeAttachmentRetryIssueId: number | null = null;
  private readonly activeIssueImageUpdates = new Set<number>();
  /**
   * Bumped whenever an attachment is merged, so a background hydration that
   * started earlier cannot overwrite a newer, deliberate change.
   */
  private readonly attachmentRevisions = new Map<number, number>();
  /**
   * The last address this page wrote into the location field. Used to tell a
   * value we filled in from one the citizen typed, so moving the pin never
   * overwrites their own words.
   */
  private lastGeocodedLocation = "";

  constructor(
    private readonly data: DataService,
    private readonly session: SessionService
  ) {}

  private cacheElements(): MyIssuesElements {
    return {
      gallery: byId<HTMLElement>("citizenIssuesGallery"),
      detailHost: byId<HTMLElement>("issueDetailModalHost"),
      resultSummary: optionalById<HTMLElement>("issuesResultSummary"),
      searchInput: byId<HTMLInputElement>("searchInput"),
      sortFilter: byId<HTMLSelectElement>("sortFilter"),
      statusFilter: byId<HTMLSelectElement>("statusFilter"),
      priorityFilter: byId<HTMLSelectElement>("priorityFilter"),
      departmentFilter: byId<HTMLSelectElement>("deptFilter"),
      categoryFilter: byId<HTMLSelectElement>("categoryFilter"),
      activeFiltersPanel: optionalById<HTMLElement>("activeFiltersPanel"),
      activeFilterChips: byId<HTMLElement>("activeFilterChips"),
      activeFilterCount: optionalById<HTMLElement>("activeFilterCount"),
      createIssueForm: byId<HTMLFormElement>("createIssueForm"),
      createIssueStatus: byId<HTMLElement>("createIssueStatus"),
      issueCategory: byId<HTMLSelectElement>("issueCategory"),
      issueRegion: byId<HTMLSelectElement>("issueRegion"),
      issueLocation: byId<HTMLInputElement>("issueLocation"),
      issueGovernorate: byId<HTMLInputElement>("issueGovernorate"),
      issueLatitude: byId<HTMLInputElement>("issueLatitude"),
      issueLongitude: byId<HTMLInputElement>("issueLongitude"),
      locationButton: byId<HTMLButtonElement>("useCurrentLocation"),
      locationStatus: byId<HTMLElement>("locationStatus"),
      pageStatus: byId<HTMLElement>("pageStatus"),
      issueImageUrl: byId<HTMLInputElement>("issueImageUrl"),
      attachmentRetryStatus: byId<HTMLElement>("attachmentRetryStatus")
    };
  }

  /** Non-null once loadDashboard has run; the renderers only fire after that. */
  private get loaded(): CitizenDashboardData {
    if (!this.dashboard) {
      throw new Error("The dashboard data has not been loaded yet.");
    }
    return this.dashboard;
  }

  private setPageStatus(message: string, tone?: string): void {
    announceStatus(this.elements.pageStatus, message, tone, "mb-4");
    if (!message) {
      this.elements.pageStatus.className = "d-none";
    }
  }

  private setCreateIssueStatus(message: string, tone?: string): void {
    announceStatus(this.elements.createIssueStatus, message, tone, "mb-3");
  }

  private findIssue(issueId: number): Issue | null {
    return findIssueById(this.dashboard?.issues, issueId);
  }

  /** Replaces one card's media element in place rather than re-rendering. */
  private refreshIssueCardImage(issue: Issue | null): void {
    refreshCardImage(this.elements.gallery, issue);
  }

  private hydrateVisibleIssueImages(): void {
    this.imageHydrator ??= new IssueImageHydrator({
      list: this.elements.gallery,
      cardSelector: "[data-issue-id]",
      findIssue: (issueId) => this.findIssue(issueId),
      fetchAttachments: (issueId) => this.data.getIssueAttachments(issueId),
      onLoaded: (issue, attachments) => {
        const issueId = Number(issue?.issueId);
        this.refreshIssueCardImage(applyAttachmentsToIssue(issue, attachments));
        this.reconcilePendingAfterHydration(issueId, attachments);
      }
    });
    this.imageHydrator.observe();
  }

  /** Consume notification deep links so a refresh does not reopen a stale modal. */
  private consumeIssueLink(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete("issueId");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  private firstName(name: string | null | undefined): string {
    return (
      String(name || "Citizen")
        .trim()
        .split(/\s+/)[0] || "Citizen"
    );
  }

  private renderAccountSummary(): void {
    const dashboard = this.loaded;
    const issues = dashboard.issues;
    const user = dashboard.currentUser;
    const unreadCount = dashboard.notifications.filter(
      (notification) => !notification.isRead
    ).length;
    const resolvedCount = issues.filter((issue) => issue.currentStatus === "Resolved").length;
    const activeCount = issues.length - resolvedCount;

    const userName = optionalById<HTMLElement>("currentUserName");
    const userAvatar = optionalById<HTMLElement>("currentUserAvatar");
    const notificationCount = optionalById<HTMLElement>("notificationCount");
    const heroTotal = optionalById<HTMLElement>("heroIssueTotal");
    const heroSummary = optionalById<HTMLElement>("heroIssueSummary");
    const heroResolved = optionalById<HTMLElement>("heroResolvedCount");

    if (userName) {
      userName.textContent = this.firstName(user?.name);
    }
    if (userAvatar) {
      userAvatar.textContent = getInitials(user?.name);
    }
    if (notificationCount) {
      notificationCount.textContent = String(unreadCount);
      notificationCount.hidden = unreadCount === 0;
      notificationCount.setAttribute(
        "aria-label",
        `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
      );
    }
    if (heroTotal) {
      heroTotal.textContent = `${issues.length} total issue${issues.length === 1 ? "" : "s"}`;
    }
    if (heroSummary) {
      heroSummary.textContent =
        issues.length === 0
          ? "Your submitted reports will appear here."
          : activeCount
            ? `${activeCount} report${activeCount === 1 ? " is" : "s are"} awaiting or receiving municipal action.`
            : "All of your reports have been resolved.";
    }
    if (heroResolved) {
      heroResolved.textContent = `${resolvedCount} resolved`;
    }
  }

  private renderStatistics(): void {
    const issues = this.loaded.issues;
    const counts: Record<string, number> = {
      total: issues.length,
      open: issues.filter((issue) => issue.currentStatus === "Open").length,
      progress: issues.filter((issue) => issue.currentStatus === "InProgress").length,
      resolved: issues.filter((issue) => issue.currentStatus === "Resolved").length
    };

    Object.entries(counts).forEach(([key, value]) => {
      const output = optionalById<HTMLElement>(
        `issueStat${key.charAt(0).toUpperCase()}${key.slice(1)}`
      );
      if (output) {
        output.textContent = String(value).padStart(2, "0");
      }
    });
  }

  private replaceSelectOptions<T>(
    select: HTMLSelectElement,
    placeholder: string,
    items: T[],
    getValue: (item: T) => string | number,
    getLabel: (item: T) => string
  ): void {
    const selectedValue = select.value;
    const fragment = document.createDocumentFragment();
    fragment.append(new Option(placeholder, ""));

    items.forEach((item) => {
      fragment.append(new Option(getLabel(item), String(getValue(item))));
    });

    select.replaceChildren(fragment);
    if ([...select.options].some((option) => option.value === selectedValue)) {
      select.value = selectedValue;
    }
  }

  private renderLookupOptions(): void {
    const dashboard = this.loaded;
    const categories = dashboard.categories;
    const regions = dashboard.regions;

    // Departments are not a lookup here - they are whatever the user's own
    // issues have been assigned to.
    const departments = [
      ...new Set(
        dashboard.issues
          .map((issue) => issue.assignedDepartmentName)
          .filter((name): name is string => Boolean(name))
      )
    ].sort((left, right) => left.localeCompare(right));

    this.replaceSelectOptions<Category>(
      this.elements.categoryFilter,
      "All Categories",
      categories,
      (category) => category.categoryName,
      (category) => category.categoryName
    );
    this.replaceSelectOptions<string>(
      this.elements.departmentFilter,
      "All Departments",
      departments,
      (department) => department,
      (department) => department
    );
    this.replaceSelectOptions<Category>(
      this.elements.issueCategory,
      "Select a category",
      categories,
      (category) => category.categoryId,
      (category) => category.categoryName
    );
    this.replaceSelectOptions(
      this.elements.issueRegion,
      "Select region",
      regions,
      (region) => region.regionId,
      (region) => `${region.regionName} — ${region.governorate}`
    );

    this.elements.issueCategory.disabled = categories.length === 0;
    this.elements.issueRegion.disabled = regions.length === 0;
  }

  private getVisibleIssues(): Issue[] {
    const filters = this.filters;
    const search = normalizedSearch(filters.search);

    const issues = this.loaded.issues.filter((issue) => {
      const searchableText = normalizedSearch(
        [
          issue.title,
          issue.description,
          issue.location,
          issue.categoryName,
          issue.assignedDepartmentName,
          issue.regionName
        ].join(" ")
      );

      return (
        (!search || searchableText.includes(search)) &&
        (!filters.status || issue.currentStatus === filters.status) &&
        (!filters.priority || issue.priority === filters.priority) &&
        (!filters.department || issue.assignedDepartmentName === filters.department) &&
        (!filters.category || issue.categoryName === filters.category)
      );
    });

    const direction = filters.sort === "oldest" ? 1 : -1;
    return issues.sort((left, right) => {
      const leftTime = new Date(left.reportedDate).getTime() || 0;
      const rightTime = new Date(right.reportedDate).getTime() || 0;
      return (leftTime - rightTime) * direction;
    });
  }

  private renderIssues(): void {
    const gallery = this.elements.gallery;
    gallery.setAttribute("aria-busy", "true");

    const visibleIssues = this.getVisibleIssues();
    const totalIssues = this.loaded.issues.length;

    if (totalIssues === 0) {
      gallery.innerHTML = `
        <div class="ocsp-card p-4 text-center" role="status">
          <i class="bi bi-clipboard-plus fs-2 text-primary mb-2" aria-hidden="true"></i>
          <h3 class="h5">No issues submitted yet</h3>
          <p class="text-muted mb-3">Create your first report to start tracking community service work.</p>
          <button class="ocsp-button ocsp-button--submit align-self-center" data-bs-toggle="modal" data-bs-target="#createIssueModal" type="button">Report an issue</button>
        </div>`;
    } else if (!visibleIssues.length) {
      gallery.innerHTML = `
        <div class="ocsp-card p-4 text-center" role="status">
          <i class="bi bi-search fs-2 text-primary mb-2" aria-hidden="true"></i>
          <h3 class="h5">No matching issues</h3>
          <p class="text-muted mb-3">Try changing your search or filters.</p>
          <button class="ocsp-button ocsp-button--cancel align-self-center" data-action="clear-filters" type="button">Clear filters</button>
        </div>`;
    } else {
      gallery.innerHTML = `
        <div class="issues-list">
          ${visibleIssues.map((issue) => renderIssueCard(issue)).join("")}
        </div>`;
    }

    if (this.elements.resultSummary) {
      this.elements.resultSummary.textContent =
        totalIssues === 0
          ? "No issues submitted yet."
          : `Showing ${visibleIssues.length} of ${totalIssues} issue${totalIssues === 1 ? "" : "s"}.`;
    }
    gallery.setAttribute("aria-busy", "false");

    const firstRender = gallery.dataset.ocspMotionRendered !== "true";
    revealList(gallery, ".issue-card, .issues-empty-state, .alert", {
      stagger: firstRender,
      interval: firstRender ? 36 : 0,
      duration: firstRender ? 240 : 160,
      distance: firstRender ? 12 : 6
    });
    gallery.dataset.ocspMotionRendered = "true";

    this.hydrateVisibleIssueImages();
  }

  private getActiveFilterDefinitions(): ActiveFilter[] {
    const filters = this.filters;
    const definitions: ActiveFilter[] = [];

    if (filters.search.trim()) {
      definitions.push({ key: "search", label: "Search", value: filters.search.trim() });
    }
    if (filters.status) {
      definitions.push({
        key: "status",
        label: "Status",
        value: getStatusMeta(filters.status).label
      });
    }
    if (filters.priority) {
      definitions.push({ key: "priority", label: "Priority", value: filters.priority });
    }
    if (filters.department) {
      definitions.push({ key: "department", label: "Dept", value: filters.department });
    }
    if (filters.category) {
      definitions.push({ key: "category", label: "Category", value: filters.category });
    }
    if (filters.sort !== "newest") {
      definitions.push({ key: "sort", label: "Sort", value: "Oldest First" });
    }

    return definitions;
  }

  private renderActiveFilters(): void {
    const filters = this.getActiveFilterDefinitions();

    if (this.elements.activeFilterCount) {
      this.elements.activeFilterCount.textContent = String(filters.length);
      this.elements.activeFilterCount.hidden = filters.length === 0;
    }
    if (this.elements.activeFiltersPanel) {
      this.elements.activeFiltersPanel.hidden = filters.length === 0;
    }

    this.elements.activeFilterChips.innerHTML = filters
      .map(
        (filter) => `
          <span class="badge bg-white text-dark border shadow-sm rounded-pill d-inline-flex align-items-center gap-2 px-3 py-2 fw-semibold">
            <span class="text-muted fw-normal">${escapeHtml(filter.label)}:</span>
            ${escapeHtml(filter.value)}
            <button type="button" class="btn-close ms-1 active-filter__dismiss" data-action="remove-filter" data-filter="${escapeHtml(filter.key)}" aria-label="Remove ${escapeHtml(filter.label)} filter"></button>
          </span>`
      )
      .join("");

    revealList(this.elements.activeFilterChips, ":scope > .badge", {
      interval: 35,
      duration: 180,
      distance: 6
    });
  }

  private syncFilterControls(): void {
    const filters = this.filters;
    if (this.elements.searchInput.value !== filters.search) {
      this.elements.searchInput.value = filters.search;
    }
    this.elements.sortFilter.value = filters.sort;
    this.elements.statusFilter.value = filters.status;
    this.elements.priorityFilter.value = filters.priority;
    this.elements.departmentFilter.value = filters.department;
    this.elements.categoryFilter.value = filters.category;

    Object.entries(STATUS_RADIO_MAP).forEach(([id, status]) => {
      const radio = optionalById<HTMLInputElement>(id);
      if (radio) {
        radio.checked = status === filters.status;
      }
    });
  }

  private renderFilteredContent(): void {
    this.syncFilterControls();
    this.renderIssues();
    this.renderActiveFilters();
  }

  private renderDashboard(): void {
    this.renderAccountSummary();
    this.renderStatistics();
    this.renderLookupOptions();
    this.renderFilteredContent();

    const warnings = this.loaded.warnings;
    if (warnings.length && this.elements.pageStatus.classList.contains("d-none")) {
      this.setPageStatus(
        `Some supporting issue data could not be loaded: ${warnings.join(", ")}.`,
        "warning"
      );
    }
  }

  private clearFilters = (): void => {
    this.filters = emptyFilters();
    this.renderFilteredContent();
  };

  private removeFilter(key: string): void {
    if (!(key in this.filters)) {
      return;
    }
    const filterKey = key as FilterKey;
    this.filters[filterKey] = filterKey === "sort" ? "newest" : "";
    this.renderFilteredContent();
  }

  /* ---------------- attachment write path ---------------- */

  private static isSupportedImageUrl(value: string): boolean {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }

  private static isMatchingImage(attachment: Attachment, imageUrl: string): boolean {
    return (
      String(attachment?.fileUrl ?? "").trim() === imageUrl &&
      String(attachment?.fileType ?? "").toLowerCase() === "image"
    );
  }

  private static hasImageAttachment(attachments: Attachment[], imageUrl: string): boolean {
    return attachments.some((attachment) => MyIssuesPage.isMatchingImage(attachment, imageUrl));
  }

  private async findExistingImageAttachment(
    issueId: number,
    imageUrl: string
  ): Promise<Attachment | null> {
    try {
      const attachments = await this.data.getIssueAttachments(issueId);
      return attachments.find((a) => MyIssuesPage.isMatchingImage(a, imageUrl)) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * A request that times out may still have committed on the server, so both
   * write paths re-read before reporting failure. Without this, pressing Retry
   * after a timeout creates a duplicate attachment.
   */
  private async attachImageToIssue(
    issueId: number,
    imageUrl: string,
    reconcileFirst: boolean
  ): Promise<Attachment> {
    if (reconcileFirst) {
      const existing = await this.findExistingImageAttachment(issueId, imageUrl);
      if (existing) {
        return existing;
      }
    }

    try {
      return await this.data.createAttachment({ issueId, fileUrl: imageUrl, fileType: "Image" });
    } catch (error) {
      const existing = await this.findExistingImageAttachment(issueId, imageUrl);
      if (existing) {
        return existing;
      }
      throw error;
    }
  }

  private async updateImageAttachment(
    issueId: number,
    attachmentId: number,
    imageUrl: string
  ): Promise<Attachment> {
    try {
      return await this.data.updateAttachment(attachmentId, {
        fileUrl: imageUrl,
        fileType: "Image"
      });
    } catch (error) {
      // A timed-out PUT can still have committed. Confirm it is the SAME
      // attachment before calling it a success.
      const saved = await this.findExistingImageAttachment(issueId, imageUrl);
      if (saved && Number(saved.attachmentId) === Number(attachmentId)) {
        return saved;
      }
      throw error;
    }
  }

  private mergeAttachmentIntoIssue(
    issueId: number,
    attachment: Attachment,
    baseAttachments?: Attachment[]
  ): void {
    const issue = this.findIssue(issueId);
    if (!issue) {
      return;
    }

    // Marks this issue as newer than any hydration already in flight.
    this.attachmentRevisions.set(issueId, (this.attachmentRevisions.get(issueId) ?? 0) + 1);

    const source = baseAttachments ?? issue.attachments;
    const attachments = source.filter(
      (item) =>
        Number(item.attachmentId) !== Number(attachment.attachmentId) &&
        String(item.fileUrl ?? "") !== String(attachment.fileUrl ?? "")
    );
    attachments.unshift(attachment);

    this.refreshIssueCardImage(applyAttachmentsToIssue(issue, attachments));
  }

  /* ---------------- retry queue ---------------- */

  /** Scoped per user, so a shared browser never offers someone else's retry. */
  private pendingStorageKey(): string {
    const userId = Number(this.dashboard?.currentUser?.userId);
    return userId > 0 ? `ocsp:pending-image-attachments:${userId}` : "";
  }

  private persistPendingAttachments(): void {
    const key = this.pendingStorageKey();
    if (!key) {
      return;
    }
    try {
      const records = [...this.pendingAttachments.values()];
      if (records.length) {
        sessionStorage.setItem(key, JSON.stringify(records));
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {
      // Storage can be disabled; the on-page retry still works this session.
    }
  }

  private restorePendingAttachments(): void {
    const key = this.pendingStorageKey();
    if (!key) {
      return;
    }
    try {
      const issueIds = new Set(this.loaded.issues.map((issue) => Number(issue.issueId)));
      const raw: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
      const records = Array.isArray(raw) ? (raw as PendingAttachment[]) : [];

      this.pendingAttachments.clear();
      records.forEach((record) => {
        const issueId = Number(record?.issueId);
        const imageUrl = String(record?.imageUrl ?? "").trim();
        // Only for issues this user still has, and only real URLs.
        if (issueIds.has(issueId) && MyIssuesPage.isSupportedImageUrl(imageUrl)) {
          this.pendingAttachments.set(issueId, { issueId, imageUrl });
        }
      });
      this.persistPendingAttachments();
      this.renderAttachmentRetries();
    } catch {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Nothing further to do; the page stays usable.
      }
    }
  }

  /**
   * Hydration doubles as reconciliation: if the image a pending retry was for
   * is already attached, the earlier request did commit and the retry goes.
   */
  private reconcilePendingAfterHydration(issueId: number, attachments: Attachment[]): void {
    const pending = this.pendingAttachments.get(issueId);
    if (!pending || this.activeAttachmentRetryIssueId === issueId) {
      return;
    }
    if (!MyIssuesPage.hasImageAttachment(attachments, pending.imageUrl)) {
      return;
    }

    // Keep focus sensible if the reader is standing on a retry button.
    const active = document.activeElement as HTMLElement | null;
    const focusedRetry =
      active &&
      this.elements.attachmentRetryStatus.contains(active) &&
      active.matches('[data-action="retry-image-attachment"]')
        ? Number(active.dataset.issueId)
        : null;

    this.pendingAttachments.delete(issueId);
    this.persistPendingAttachments();
    this.renderAttachmentRetries(
      focusedRetry && this.pendingAttachments.has(focusedRetry) ? focusedRetry : null
    );

    if (focusedRetry === issueId) {
      this.setPageStatus("The saved image is already attached.", "success");
      this.elements.pageStatus.focus();
    }
  }

  /**
   * Built with createElement rather than innerHTML: the issue id is the only
   * dynamic part, but this banner is rebuilt on every retry and keeping it out
   * of string concatenation removes the question entirely.
   */
  private renderAttachmentRetries(focusIssueId: number | null = null): void {
    const host = this.elements.attachmentRetryStatus;
    host.textContent = "";

    if (!this.pendingAttachments.size) {
      host.className = "d-none";
      host.removeAttribute("aria-busy");
      return;
    }

    host.className = "alert alert-warning mb-4";
    if (this.activeAttachmentRetryIssueId !== null) {
      host.setAttribute("aria-busy", "true");
    } else {
      host.removeAttribute("aria-busy");
    }

    const heading = document.createElement("strong");
    heading.className = "d-block mb-2";
    heading.textContent = "Some issue images still need to be attached.";
    host.append(heading);

    this.pendingAttachments.forEach((_pending, issueId) => {
      const row = document.createElement("div");
      row.className =
        "d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mt-2";

      const message = document.createElement("span");
      message.textContent = `Issue #${issueId}: retry the saved image URL without creating another issue.`;

      const retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.className = "ocsp-button ocsp-button--cancel flex-shrink-0";
      retryButton.dataset.action = "retry-image-attachment";
      retryButton.dataset.issueId = String(issueId);
      retryButton.setAttribute("aria-label", `Retry image for issue #${issueId}`);
      // Disabled while any retry runs, so two cannot overlap.
      retryButton.disabled =
        this.activeAttachmentRetryIssueId !== null || this.activeIssueImageUpdates.has(issueId);
      retryButton.innerHTML =
        this.activeAttachmentRetryIssueId === issueId
          ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Retrying image...'
          : '<i class="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>Retry image';

      row.append(message, retryButton);
      host.append(row);
    });

    if (focusIssueId) {
      requestAnimationFrame(() => {
        host
          .querySelector<HTMLElement>(`[data-issue-id="${safeDomId(focusIssueId)}"]`)
          ?.focus();
      });
    }
  }

  private showAttachmentRetry(issueId: number, imageUrl: string, focusRetry = false): void {
    this.pendingAttachments.set(issueId, { issueId, imageUrl });
    this.persistPendingAttachments();
    this.renderAttachmentRetries(focusRetry ? issueId : null);
    feedback.warning(
      "The issue was created, but its image could not be attached. Use Retry image without creating another issue.",
      { announce: false, key: `attachment-retry-${issueId}` }
    );
  }

  private async retryPendingAttachment(button: HTMLElement): Promise<void> {
    const issueId = Number(button.dataset.issueId);
    const pending = this.pendingAttachments.get(issueId);

    if (
      !pending ||
      this.activeAttachmentRetryIssueId !== null ||
      this.activeIssueImageUpdates.has(issueId)
    ) {
      return;
    }

    this.activeAttachmentRetryIssueId = issueId;
    this.renderAttachmentRetries();

    const succeeded = (): void => {
      this.activeAttachmentRetryIssueId = null;
      this.persistPendingAttachments();
      this.renderAttachmentRetries();
      this.setPageStatus("The image was attached successfully.", "success");
      this.elements.pageStatus.focus();
    };

    try {
      const attachment = await this.attachImageToIssue(pending.issueId, pending.imageUrl, true);
      this.mergeAttachmentIntoIssue(pending.issueId, attachment);
      // Only clear if nothing replaced it while the request was in flight.
      if (this.pendingAttachments.get(issueId)?.imageUrl === pending.imageUrl) {
        this.pendingAttachments.delete(issueId);
      }
      succeeded();
    } catch {
      this.activeAttachmentRetryIssueId = null;
      const current = this.pendingAttachments.get(issueId);
      const issue = this.findIssue(issueId);

      // The request failed, but the image may have landed anyway.
      if (
        current?.imageUrl === pending.imageUrl &&
        MyIssuesPage.hasImageAttachment(issue?.attachments ?? [], pending.imageUrl)
      ) {
        this.pendingAttachments.delete(issueId);
        succeeded();
      } else if (current?.imageUrl === pending.imageUrl) {
        this.showAttachmentRetry(pending.issueId, pending.imageUrl, true);
      } else {
        this.renderAttachmentRetries();
      }
    }
  }

  /**
   * Clears the "New update" ribbon once the reader has actually opened the
   * issue, and marks the notification behind it read so it does not come back
   * on the next load.
   *
   * decorateIssuesWithFreshUpdates stored freshUpdateNotificationId for exactly
   * this, but nothing consumed it - so the ribbon sat on the card until the
   * notification happened to be read elsewhere, or the day rolled over.
   *
   * Best-effort: opening the issue is the point, and a failed mark-read must
   * not interfere with that. The ribbon still clears locally either way, since
   * the reader has plainly seen the update.
   */
  private async clearFreshUpdate(issueId: number): Promise<void> {
    const issue = this.findIssue(issueId);
    if (!issue?.ui?.hasFreshUpdate) {
      return;
    }

    const notificationId = Number(issue.ui.freshUpdateNotificationId);

    issue.ui = { ...issue.ui, hasFreshUpdate: false };
    const card = this.elements.gallery.querySelector<HTMLElement>(
      `[data-issue-id="${safeDomId(issueId)}"]`
    );
    card?.classList.remove("is-updated");
    card?.querySelector(".fresh-update")?.remove();

    if (!Number.isInteger(notificationId) || notificationId < 1) {
      return;
    }

    try {
      await this.data.markNotificationAsRead(notificationId);
      const notification = this.dashboard?.notifications.find(
        (item) => Number(item.notificationId) === notificationId
      );
      if (notification) {
        notification.isRead = true;
      }
    } catch {
      // The ribbon is already gone for this session; it will reappear on the
      // next load, which is the honest outcome of a failed write.
    }
  }

  private async showIssueDetails(issueId: number, trigger: HTMLElement | null): Promise<void> {
    this.setPageStatus("");
    this.openIssueTrigger = trigger ?? (document.activeElement as HTMLElement | null);

    try {
      const issue = await this.data.getIssueDetails(issueId);

      // The image-update panel only makes sense when the attachments actually
      // loaded, and it prefills with the image THIS user uploaded.
      const currentUserId = Number(this.loaded.currentUser?.userId);
      const editableImage =
        issue.attachments.find(
          (attachment) =>
            String(attachment.fileType ?? "").toLowerCase() === "image" &&
            Number(attachment.uploadedById) === currentUserId
        ) ?? null;
      issue.ui = {
        ...issue.ui,
        imageUpdateAvailable: !issue.warnings.includes("attachments"),
        editableImageUrl: editableImage?.fileUrl ?? ""
      };

      this.elements.detailHost.innerHTML = renderIssueDetailModal(issue);
      revealWithin(this.elements.detailHost, { interval: 45, distance: 8 });
      const modalElement = byId<HTMLElement>(`citizenIssueDetails-${safeDomId(issueId)}`);

      // Leaflet measures the element, so the map can only be built once the
      // markup is in the document. Bootstrap's shown event is the point at
      // which the modal actually has a size.
      modalElement.addEventListener(
        "shown.bs.modal",
        () => {
          void mountMapsIn(modalElement);
        },
        { once: true }
      );

      modalElement.addEventListener(
        "hidden.bs.modal",
        () => {
          const returnFocus = this.openIssueTrigger;
          this.openIssueTrigger = null;
          this.elements.detailHost.replaceChildren();
          if (returnFocus?.isConnected) {
            returnFocus.focus();
          }
        },
        { once: true }
      );

      // Bootstrap's JS is a CDN script, so it may genuinely be absent.
      if (!window.bootstrap?.Modal) {
        throw new Error(
          "Bootstrap JavaScript could not be loaded, so the details dialog is unavailable."
        );
      }
      window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
      this.consumeIssueLink();
      void this.clearFreshUpdate(issueId);
    } catch (error) {
      this.openIssueTrigger = null;
      this.elements.detailHost.replaceChildren();
      this.setPageStatus(errorMessage(error, "The issue details could not be loaded."), "danger");
    }
  }

  private async addComment(form: HTMLFormElement): Promise<void> {
    const issueId = Number(form.dataset.issueId);
    const input = form.querySelector<HTMLInputElement>("[data-comment-input]");
    const submitButton = form.querySelector<HTMLButtonElement>('[type="submit"]');
    const status = form.parentElement?.querySelector<HTMLElement>("[data-comment-status]");
    const thread = form.parentElement?.querySelector<HTMLElement>("[data-comment-thread]");

    if (!input || !submitButton || !status || !thread || form.dataset.submitting === "true") {
      return;
    }

    const content = input.value.trim();
    if (!content) {
      input.focus();
      return;
    }

    status.textContent = "Adding comment...";
    form.dataset.submitting = "true";
    input.disabled = true;
    submitButton.disabled = true;

    try {
      const response = await this.data.addComment(issueId, content);
      const user = this.loaded.currentUser;
      // The POST already succeeded. Render its DTO locally so a later GET
      // failure cannot invite the citizen to submit the same comment twice.
      // Each field prefers the server's value and falls back to what we sent.
      const comment: Comment = {
        commentId: response?.commentId ?? 0,
        issueId: response?.issueId ?? issueId,
        userId: response?.userId ?? user?.userId ?? 0,
        userName: response?.userName ?? user?.name ?? "Citizen",
        content: response?.content ?? content,
        isStaffComment: response?.isStaffComment ?? false,
        commentDate: response?.commentDate ?? new Date().toISOString()
      };

      thread.querySelector("[data-empty-comments]")?.remove();
      thread.insertAdjacentHTML("beforeend", renderComments([comment]));
      revealList(thread, ".comment-card", { stagger: false, duration: 220, distance: 7 });
      input.value = "";
      status.textContent = "Comment added.";
      feedback.success("Comment added.", { announce: false });
    } catch (error) {
      status.textContent = errorMessage(error, "The comment could not be added.");
    } finally {
      delete form.dataset.submitting;
      input.disabled = false;
      submitButton.disabled = false;
      input.focus();
    }
  }

  private selectRating(button: HTMLElement): void {
    const panel = button.closest<HTMLElement>("[data-rating-panel]");
    if (!panel) {
      return;
    }

    const selectedScore = Number(button.dataset.score);
    panel.dataset.selectedRating = String(selectedScore);

    panel
      .querySelectorAll<HTMLElement>('[data-action="select-rating"]')
      .forEach((ratingButton) => {
        const score = Number(ratingButton.dataset.score);
        ratingButton.setAttribute("aria-pressed", String(score === selectedScore));
        const icon = ratingButton.querySelector("i");
        if (icon) {
          icon.className = `bi ${score <= selectedScore ? "bi-star-fill" : "bi-star"}`;
        }
      });
  }

  private async submitRating(button: HTMLButtonElement): Promise<void> {
    const panel = button.closest<HTMLElement>("[data-rating-panel]");
    if (!panel) {
      return;
    }

    const issueId = Number(panel.dataset.issueId);
    const ratingId = Number(panel.dataset.ratingId) || null;
    const score = Number(panel.dataset.selectedRating);
    const feedbackField = panel.querySelector<HTMLTextAreaElement>("[data-rating-feedback]");
    const status = panel.querySelector<HTMLElement>("[data-rating-status]");
    if (!feedbackField || !status) {
      return;
    }

    const feedback = feedbackField.value.trim();
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      status.textContent = "Choose a rating from 1 to 5 stars.";
      return;
    }

    button.disabled = true;
    status.textContent = ratingId ? "Updating feedback..." : "Saving feedback...";

    try {
      const response = await this.data.saveRating(ratingId, issueId, score, feedback);
      const user = this.loaded.currentUser;
      const savedRating: Rating = {
        ratingId: response?.ratingId ?? ratingId ?? 0,
        issueId: response?.issueId ?? issueId,
        userId: response?.userId ?? user?.userId ?? 0,
        score: response?.score ?? score,
        feedback: response?.feedback ?? (feedback || null),
        ratedAt: response?.ratedAt ?? new Date().toISOString()
      };

      // Keep the returned database id so a second submission is a PUT rather
      // than a duplicate create.
      panel.dataset.ratingId = String(savedRating.ratingId || "");
      const issue = this.loaded.issues.find((item) => Number(item.issueId) === issueId);
      if (issue) {
        issue.rating = savedRating;
      }
      button.innerHTML = '<i class="bi bi-send-fill" aria-hidden="true"></i> Update Feedback';
      status.textContent = "Thank you. Your feedback has been saved.";
    } catch (error) {
      status.textContent = errorMessage(error, "The rating could not be saved.");
    } finally {
      button.disabled = false;
    }
  }

  /* ---------------- image update panel ---------------- */

  private static canUpdate(issue: Issue | null): boolean {
    return Boolean(issue && ["Open", "InProgress"].includes(issue.currentStatus));
  }

  private setImageUpdateStatus(form: HTMLFormElement, message: string, tone?: string): void {
    const status = form.querySelector<HTMLElement>("[data-image-update-status]");
    if (!status) {
      return;
    }
    const toneClass =
      { danger: "text-danger", warning: "text-warning", info: "text-muted" }[tone ?? "info"] ?? "";
    status.className = `small mb-3 ${toneClass}`.trim();
    status.textContent = message || "";
  }

  private setImageUpdatePanel(toggle: HTMLElement, expanded: boolean): void {
    const panelId = toggle.getAttribute("aria-controls");
    const panel = panelId ? optionalById<HTMLElement>(panelId) : null;
    if (!panel) {
      return;
    }

    panel.hidden = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));

    if (expanded) {
      const form = panel.querySelector<HTMLFormElement>('form[data-action="update-issue-image"]');
      if (form) {
        this.setImageUpdateStatus(form, "");
      }
      requestAnimationFrame(() =>
        panel.querySelector<HTMLInputElement>('input[name="imageUrl"]')?.focus()
      );
    } else {
      toggle.focus();
    }
  }

  private closeIssueDialog(form: HTMLFormElement): void {
    const modalElement = form.closest<HTMLElement>(".modal");
    if (modalElement && window.bootstrap?.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    }
  }

  private async updateIssueImage(form: HTMLFormElement): Promise<void> {
    if (form.dataset.submitting === "true" || !form.reportValidity()) {
      return;
    }

    const issueId = Number(form.dataset.issueId);
    const localIssue = this.findIssue(issueId);
    const input = form.querySelector<HTMLInputElement>('input[name="imageUrl"]');
    const submitButton = form.querySelector<HTMLButtonElement>('[type="submit"]');
    if (!input || !submitButton) {
      return;
    }

    const imageUrl = input.value.trim();

    if (!MyIssuesPage.canUpdate(localIssue)) {
      const message = "Only Open or In Progress issues can update their image.";
      this.setImageUpdateStatus(form, message, "warning");
      feedback.warning(message, { announce: false });
      return;
    }

    // Never let an older queued upload race a newer URL for the same issue.
    if (
      this.activeAttachmentRetryIssueId === issueId ||
      this.activeIssueImageUpdates.has(issueId)
    ) {
      const message = "Wait for the current image retry to finish, then update the image.";
      this.setImageUpdateStatus(form, message, "warning");
      feedback.warning(message, { announce: false });
      return;
    }

    if (!MyIssuesPage.isSupportedImageUrl(imageUrl)) {
      this.setImageUpdateStatus(form, "Enter an image URL beginning with http:// or https://.", "danger");
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }

    input.removeAttribute("aria-invalid");
    this.setImageUpdateStatus(form, "Checking the latest issue status...", "info");
    form.dataset.submitting = "true";
    form.setAttribute("aria-busy", "true");

    const cancelButton = form.querySelector<HTMLButtonElement>(
      '[data-action="cancel-issue-image-update"]'
    );
    const updateToggle = form
      .closest<HTMLElement>(".modal")
      ?.querySelector<HTMLButtonElement>('[data-action="toggle-issue-image-update"]');

    input.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
    if (updateToggle) updateToggle.disabled = true;
    this.activeIssueImageUpdates.add(issueId);
    this.renderAttachmentRetries();
    setButtonBusy(submitButton, true, "Saving image...");

    try {
      // Re-read first: the status may have changed while the dialog sat open,
      // and the backend does not enforce this particular UI rule.
      const latest = await this.data.getIssueDetails(issueId);

      if (!MyIssuesPage.canUpdate(latest)) {
        if (localIssue) {
          localIssue.currentStatus = latest.currentStatus;
        }
        this.renderDashboard();
        this.openIssueTrigger = this.elements.gallery.querySelector<HTMLElement>(
          `[data-action="open-issue"][data-issue-id="${safeDomId(issueId)}"]`
        );
        feedback.warning("This issue can no longer be updated because it is resolved.");
        this.closeIssueDialog(form);
        return;
      }

      if (latest.warnings.includes("attachments")) {
        throw new Error("The current image could not be verified. Please try again.");
      }

      const attachments = latest.attachments;
      const currentUserId = Number(this.loaded.currentUser?.userId);
      const exactImage =
        attachments.find((a) => MyIssuesPage.isMatchingImage(a, imageUrl)) ?? null;
      const ownedImage =
        attachments.find(
          (a) =>
            String(a.fileType ?? "").toLowerCase() === "image" &&
            Number(a.uploadedById) === currentUserId
        ) ?? null;

      let savedAttachment: Attachment;
      let successMessage: string;

      if (exactImage) {
        savedAttachment = exactImage;
        successMessage = "The image URL is already up to date.";
      } else if (ownedImage) {
        savedAttachment = await this.updateImageAttachment(
          issueId,
          ownedImage.attachmentId,
          imageUrl
        );
        successMessage = "The issue image was updated successfully.";
      } else {
        savedAttachment = await this.attachImageToIssue(issueId, imageUrl, true);
        successMessage = "The issue image was added successfully.";
      }

      this.mergeAttachmentIntoIssue(issueId, savedAttachment, attachments);
      // A deliberate update supersedes any older create-image retry.
      this.pendingAttachments.delete(issueId);
      this.persistPendingAttachments();
      this.renderAttachmentRetries();
      this.setImageUpdateStatus(form, "");
      feedback.success(successMessage);
      this.closeIssueDialog(form);
    } catch (error) {
      const message = errorMessage(error, "The issue image could not be updated.");
      this.setImageUpdateStatus(form, message, "danger");
      feedback.error(message, { announce: false });
    } finally {
      this.activeIssueImageUpdates.delete(issueId);
      this.renderAttachmentRetries();
      delete form.dataset.submitting;
      form.removeAttribute("aria-busy");
      input.disabled = false;
      if (cancelButton) cancelButton.disabled = false;
      if (updateToggle) updateToggle.disabled = false;
      setButtonBusy(submitButton, false);
    }
  }

  private updateGovernorate = (): void => {
    const region = this.loaded.regions.find(
      (item) => Number(item.regionId) === Number(this.elements.issueRegion.value)
    );
    this.elements.issueGovernorate.value = region ? region.governorate : "";
  };

  /**
   * Opens the create dialog properly when the page is reached via
   * my-issues.html#createIssueModal - the link the home page uses.
   *
   * The stylesheet shows these dialogs on :target so they work without
   * JavaScript, but a dialog opened that way has no Bootstrap Modal instance
   * behind it. That left the deep-linked dialog unclosable, because
   * data-bs-dismiss had nothing to dismiss, and blank where the map should be,
   * because shown.bs.modal never fired to mount it.
   *
   * Re-opening it through Bootstrap and dropping the hash puts the dialog back
   * on the single code path the in-page button already uses.
   */
  private openCreateModalFromHash(): void {
    if (window.location.hash !== "#createIssueModal") {
      return;
    }

    const modalElement = optionalById<HTMLElement>("createIssueModal");
    if (!modalElement || !window.bootstrap?.Modal) {
      // Without Bootstrap the :target rule is the only thing that can show it,
      // so leave the hash alone rather than closing the dialog outright.
      return;
    }

    // Clear the hash FIRST, or the :target rule keeps a second copy of the
    // dialog on screen underneath Bootstrap's, and closing leaves that behind.
    //
    // It has to be an assignment to location.hash. history.replaceState
    // rewrites the URL without re-evaluating :target, so the rule keeps
    // matching and the dialog stays visible - verified, not assumed.
    window.location.hash = "";

    // That leaves a trailing "#". Tidying it with replaceState is safe now:
    // the target is already cleared, and replaceState will not bring it back.
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}`);

    window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
  }

  private closeCreateModal(): void {
    const modalElement = optionalById<HTMLElement>("createIssueModal");
    if (modalElement && window.bootstrap?.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    }
  }

  private async createIssue(form: HTMLFormElement): Promise<void> {
    const submitButton = form.querySelector<HTMLButtonElement>('[type="submit"]');
    if (!submitButton) {
      return;
    }

    const formData = new FormData(form);
    const latitude = Number.parseFloat(formString(formData, "issueLatitude"));
    const longitude = Number.parseFloat(formString(formData, "issueLongitude"));
    const imageUrl = formString(formData, "issueImageUrl").trim();
    const payload: CreateIssueRequest = {
      title: formString(formData, "issueTitle").trim(),
      description: formString(formData, "issueDescription").trim(),
      location: formString(formData, "issueLocation").trim(),
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      priority: (formString(formData, "priority") ||
        "Medium") as CreateIssueRequest["priority"],
      categoryId: Number(formData.get("issueCategory")),
      regionId: Number(formData.get("issueRegion"))
    };

    if (imageUrl && !MyIssuesPage.isSupportedImageUrl(imageUrl)) {
      this.setCreateIssueStatus("Enter an image URL beginning with http:// or https://.", "danger");
      this.elements.issueImageUrl.setAttribute("aria-invalid", "true");
      this.elements.issueImageUrl.focus();
      return;
    }
    this.elements.issueImageUrl.removeAttribute("aria-invalid");

    this.setCreateIssueStatus("");
    form.setAttribute("aria-busy", "true");
    setButtonBusy(submitButton, true, "Submitting issue...");

    try {
      // The service reads the issue back so the new card matches every other
      // card. The lookups are passed in so it can resolve the same
      // client-side fields the dashboard load resolves.
      const created = await this.data.createIssue(
        payload,
        this.loaded.categories,
        this.loaded.regions
      );

      // Attachments are a separate resource, so the issue has to exist before
      // its image URL can be associated with it. A failure here does not undo
      // the issue - it becomes a retry instead.
      let createdAttachment: Attachment | null = null;
      let attachmentFailed = false;
      if (imageUrl) {
        try {
          createdAttachment = await this.attachImageToIssue(created.issueId, imageUrl, false);
        } catch {
          attachmentFailed = true;
        }
      }
      const category = this.loaded.categories.find(
        (item) => Number(item.categoryId) === payload.categoryId
      );
      const region = this.loaded.regions.find(
        (item) => Number(item.regionId) === payload.regionId
      );

      this.loaded.issues = [
        {
          ...created,
          categoryId: created.categoryId ?? payload.categoryId,
          regionId: created.regionId ?? payload.regionId,
          categoryName: created.categoryName || category?.categoryName || "",
          regionName: created.regionName || region?.regionName || "",
          governorate: created.governorate || region?.governorate || "",
          // Always null from the create endpoint; the read-back usually fills
          // it, and the category lookup covers the case where it does not.
          assignedDepartmentName:
            created.assignedDepartmentName ?? category?.departmentName ?? null,
          attachments: createdAttachment ? [createdAttachment] : created.attachments,
          ui: {
            ...created.ui,
            attachmentsLoaded: !attachmentFailed,
            ...(createdAttachment
              ? {
                  imageUrl: createdAttachment.fileUrl,
                  imageAlt: payload.title,
                  previewLabel: "Issue photo"
                }
              : {})
          }
        },
        ...this.loaded.issues
      ];

      form.reset();
      const priorityMedium = optionalById<HTMLInputElement>("priorityMedium");
      if (priorityMedium) {
        priorityMedium.checked = true;
      }
      this.elements.issueGovernorate.value = "";
      this.elements.issueLatitude.value = "";
      this.elements.issueLongitude.value = "";
      this.elements.locationStatus.className = "location-capture__status";
      this.elements.locationStatus.textContent =
        "Use your device location, or enter the location manually.";
      this.lastGeocodedLocation = "";

      this.elements.issueImageUrl.removeAttribute("aria-invalid");
      this.renderDashboard();
      this.setCreateIssueStatus("");
      this.closeCreateModal();

      if (attachmentFailed) {
        this.showAttachmentRetry(created.issueId, imageUrl);
      } else if (createdAttachment) {
        this.setPageStatus("The issue and its image were added successfully.", "success");
      } else {
        this.setPageStatus("The issue was added successfully.", "success");
      }
    } catch (error) {
      this.setCreateIssueStatus(
        errorMessage(error, "The issue could not be created."),
        "danger"
      );
      this.elements.createIssueStatus.focus();
    } finally {
      form.removeAttribute("aria-busy");
      setButtonBusy(submitButton, false);
    }
  }

  /**
   * The create dialog's map. Mounted on first open rather than at start-up,
   * because a map built inside a display:none dialog measures itself as zero.
   */
  private initializeCreateMap(): void {
    const container = optionalById<HTMLElement>("issueLocationMap");
    if (!container) {
      return;
    }

    container.addEventListener("ocsp:map-pick", (event) => {
      const detail = (event as CustomEvent<MapPickDetail>).detail;
      void this.applyPinnedLocation(detail.latitude, detail.longitude, "Location pinned.");
    });

    optionalById<HTMLElement>("createIssueModal")?.addEventListener("shown.bs.modal", () => {
      void mountMapsIn(document);
    });
  }

  /**
   * Records a chosen point: fills the coordinate fields, then asks OpenStreetMap
   * what is there and fills the written location too.
   *
   * The address is only written into a field the citizen has not typed in
   * themselves - their own wording always wins, and moving the pin afterwards
   * will not wipe it.
   */
  private async applyPinnedLocation(
    latitude: number,
    longitude: number,
    prefix: string
  ): Promise<void> {
    this.elements.issueLatitude.value = latitude.toFixed(6);
    this.elements.issueLongitude.value = longitude.toFixed(6);

    const current = this.elements.issueLocation.value.trim();
    const mayOverwrite = current === "" || current === this.lastGeocodedLocation;

    this.elements.locationStatus.className = "location-capture__status is-loading";
    this.elements.locationStatus.textContent = `${prefix} Looking up the address...`;

    const address = await reverseGeocode(latitude, longitude);

    this.elements.locationStatus.className = "location-capture__status is-success";

    if (!address) {
      this.elements.locationStatus.textContent =
        `${prefix} The address could not be looked up - please describe the location below.`;
      return;
    }

    if (!mayOverwrite) {
      this.elements.locationStatus.textContent =
        `${prefix} Your own location text was kept. Nearby: ${address}`;
      return;
    }

    this.elements.issueLocation.value = address;
    this.lastGeocodedLocation = address;
    this.elements.locationStatus.textContent =
      `${prefix} Location set to "${address}" - edit it if a landmark would be clearer.`;
  }

  private initializeLocationCapture(): void {
    if (!navigator.geolocation) {
      this.elements.locationStatus.textContent =
        "Location capture is not supported in this browser.";
      return;
    }

    this.elements.locationButton.disabled = false;
    this.elements.locationButton.removeAttribute("aria-disabled");
    this.elements.locationStatus.textContent =
      "Use your device location, or enter the location manually.";
  }

  private captureCurrentLocation = (): void => {
    this.elements.locationButton.disabled = true;
    this.elements.locationStatus.className = "location-capture__status is-loading";
    this.elements.locationStatus.textContent = "Requesting your device location...";

    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        const mapContainer = optionalById<HTMLElement>("issueLocationMap");
        if (mapContainer) {
          setMapPin(mapContainer, latitude, longitude);
        }
        void this.applyPinnedLocation(latitude, longitude, "Using your current position.");
        this.elements.locationButton.disabled = false;
      },
      (error: GeolocationPositionError) => {
        this.elements.locationStatus.className = "location-capture__status is-error";
        this.elements.locationStatus.textContent =
          error.message || "Location permission was not granted.";
        this.elements.locationButton.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  private bindFilterEvents(): void {
    // Debounced so typing does not re-render the list on every keystroke.
    this.elements.searchInput.addEventListener("input", (event) => {
      window.clearTimeout(this.searchTimer);
      const value = (event.target as HTMLInputElement).value;
      this.searchTimer = window.setTimeout(() => {
        this.filters.search = value;
        this.renderFilteredContent();
      }, 150);
    });

    const selectFilters: [HTMLSelectElement, FilterKey][] = [
      [this.elements.sortFilter, "sort"],
      [this.elements.statusFilter, "status"],
      [this.elements.priorityFilter, "priority"],
      [this.elements.departmentFilter, "department"],
      [this.elements.categoryFilter, "category"]
    ];

    selectFilters.forEach(([select, key]) => {
      select.addEventListener("change", (event) => {
        this.filters[key] = (event.target as HTMLSelectElement).value;
        this.renderFilteredContent();
      });
    });

    Object.entries(STATUS_RADIO_MAP).forEach(([id, status]) => {
      optionalById<HTMLInputElement>(id)?.addEventListener("change", (event) => {
        if ((event.target as HTMLInputElement).checked) {
          this.filters.status = status;
          this.renderFilteredContent();
        }
      });
    });

    optionalById<HTMLButtonElement>("resetFiltersButton")?.addEventListener(
      "click",
      this.clearFilters
    );
    optionalById<HTMLButtonElement>("clearAllFiltersButton")?.addEventListener(
      "click",
      this.clearFilters
    );
  }

  private bindDelegatedEvents(): void {
    this.elements.gallery.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest('[data-action="retry-issues"]')) {
        void this.loadDashboard();
        return;
      }

      const openButton = event.target.closest<HTMLElement>('[data-action="open-issue"]');
      if (openButton) {
        void this.showIssueDetails(Number(openButton.dataset.issueId), openButton);
        return;
      }

      if (event.target.closest('[data-action="clear-filters"]')) {
        this.clearFilters();
        requestAnimationFrame(() => this.elements.searchInput.focus());
      }
    });

    this.elements.attachmentRetryStatus.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const retry = event.target.closest<HTMLElement>('[data-action="retry-image-attachment"]');
      if (retry) {
        void this.retryPendingAttachment(retry);
      }
    });

    this.elements.activeFilterChips.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const button = event.target.closest<HTMLElement>('[data-action="remove-filter"]');
      if (button?.dataset.filter) {
        this.removeFilter(button.dataset.filter);
      }
    });

    this.elements.detailHost.addEventListener("submit", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const imageForm = event.target.closest<HTMLFormElement>(
        'form[data-action="update-issue-image"]'
      );
      if (imageForm) {
        event.preventDefault();
        void this.updateIssueImage(imageForm);
        return;
      }

      const commentForm = event.target.closest<HTMLFormElement>('form[data-action="add-comment"]');
      if (commentForm) {
        event.preventDefault();
        void this.addComment(commentForm);
      }

    });

    // Clears the invalid marker as soon as the reader starts fixing the URL.
    this.elements.detailHost.addEventListener("input", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.name !== "imageUrl") {
        return;
      }
      const form = input.closest<HTMLFormElement>('form[data-action="update-issue-image"]');
      input.removeAttribute("aria-invalid");
      if (form) {
        this.setImageUpdateStatus(form, "");
      }
    });

    this.elements.detailHost.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const updateToggle = event.target.closest<HTMLElement>(
        '[data-action="toggle-issue-image-update"]'
      );
      if (updateToggle) {
        this.setImageUpdatePanel(
          updateToggle,
          updateToggle.getAttribute("aria-expanded") !== "true"
        );
        return;
      }

      const updateCancel = event.target.closest<HTMLElement>(
        '[data-action="cancel-issue-image-update"]'
      );
      if (updateCancel) {
        const form = updateCancel.closest<HTMLFormElement>(
          'form[data-action="update-issue-image"]'
        );
        const toggle = updateCancel
          .closest<HTMLElement>(".modal")
          ?.querySelector<HTMLElement>('[data-action="toggle-issue-image-update"]');
        if (form) {
          this.setImageUpdateStatus(form, "");
        }
        if (toggle) {
          this.setImageUpdatePanel(toggle, false);
        }
        return;
      }

      const ratingButton = event.target.closest<HTMLElement>('[data-action="select-rating"]');
      if (ratingButton) {
        this.selectRating(ratingButton);
        return;
      }
      const submitButton = event.target.closest<HTMLButtonElement>(
        '[data-action="submit-rating"]'
      );
      if (submitButton) {
        void this.submitRating(submitButton);
      }
    });
  }

  private bindFormEvents(): void {
    optionalById<HTMLElement>("createIssueModal")?.addEventListener("show.bs.modal", () => {
      this.setCreateIssueStatus("");
    });

    this.elements.createIssueForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (this.elements.createIssueForm.reportValidity()) {
        void this.createIssue(this.elements.createIssueForm);
      }
    });

    this.elements.issueRegion.addEventListener("change", this.updateGovernorate);
    this.elements.locationButton.addEventListener("click", this.captureCurrentLocation);
  }

  /** Opens the issue a notification deep-linked to, if the user owns it. */
  private async openLinkedIssueFromUrl(): Promise<void> {
    const rawIssueId = new URLSearchParams(window.location.search).get("issueId");
    if (!rawIssueId) {
      return;
    }

    const issueId = Number(rawIssueId);
    const issueExists =
      Number.isInteger(issueId) &&
      issueId > 0 &&
      this.loaded.issues.some((issue) => Number(issue.issueId) === issueId);

    if (!issueExists) {
      this.setPageStatus("The linked issue could not be found.", "warning");
      this.consumeIssueLink();
      return;
    }

    const trigger = this.elements.gallery.querySelector<HTMLElement>(
      `[data-action="open-issue"][data-issue-id="${safeDomId(issueId)}"]`
    );
    await this.showIssueDetails(issueId, trigger);
  }

  private loadDashboard = async (): Promise<void> => {
    this.setPageStatus("");
    renderSkeletons(this.elements.gallery, {
      count: 3,
      variant: "issue",
      label: "Loading issues..."
    });

    try {
      this.dashboard = await this.data.getDashboardData();
      this.renderDashboard();
      // Any retry saved in a previous visit, for issues this user still has.
      this.restorePendingAttachments();
      await this.openLinkedIssueFromUrl();
    } catch (error) {
      const message = errorMessage(error, "The issue data could not be loaded.");
      feedback.error(message, { announce: false });
      this.elements.gallery.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <p>${escapeHtml(message)}</p>
          <button class="ocsp-button ocsp-button--submit" data-action="retry-issues" type="button">Try again</button>
        </div>`;
      this.elements.gallery.setAttribute("aria-busy", "false");
    }
  };

  /**
   * The floating button turns its plus into a close mark while the dialog is
   * open. That rotation is CSS, and it is invisible to anyone not looking at
   * it, so the button's state and its name have to change too - otherwise a
   * screen reader still offers "Create a new issue" for a control that now
   * closes one.
   */
  private bindCreateFab(): void {
    const fab = optionalById<HTMLElement>("createIssueFab");
    const modal = optionalById<HTMLElement>("createIssueModal");
    if (!fab || !modal) {
      return;
    }

    const setOpen = (open: boolean): void => {
      fab.setAttribute("aria-expanded", String(open));
      fab.setAttribute("aria-label", open ? "Close the new issue form" : "Create a new issue");
    };

    modal.addEventListener("shown.bs.modal", () => {
      setOpen(true);
    });
    modal.addEventListener("hidden.bs.modal", () => {
      setOpen(false);
    });
  }

  start(): void {
    try {
      this.elements = this.cacheElements();
    } catch (error) {
      const status = document.getElementById("pageStatus");
      if (!status) {
        throw error;
      }
      setAlert(status, errorMessage(error, "The page failed to start."), "danger", "mb-4");
      return;
    }

    // This is where signing in lands a citizen, so it has to consume the flash
    // that login sets. Leaving it unread does not discard it - it waits in
    // storage for whichever page reads next, which is how "Signed in
    // successfully" used to surface on a later visit to notifications.
    const flash = this.session.consumeFlash();

    this.bindFilterEvents();
    this.bindDelegatedEvents();
    this.bindFormEvents();
    this.bindCreateFab();
    this.initializeLocationCapture();
    this.initializeCreateMap();
    this.openCreateModalFromHash();
    void this.loadDashboard();

    if (flash?.message) {
      // Toast only. A flash is a note about the previous page; repeating it in
      // this page's own status region reads as a second, stuck message.
      feedback.show(flash.message, { tone: toTone(flash.tone) });
    }
  }
}
