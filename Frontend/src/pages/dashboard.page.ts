/**
 * The staff and admin workspace: issue list, filters, lazy detail dialog with
 * status changes and comments, and the admin platform-setup forms.
 *
 * Two things drive most of the complexity here and are worth knowing up front:
 *
 * 1. The issue dialog is URL-driven. Its open state lives in location.hash, so
 *    Back and Forward work, and notification deep links (?issueId=) are
 *    consumed into the hash exactly once so a refresh does not reopen them.
 *
 * 2. One focus trap serves three dialogs - the data-rendered issue modal and
 *    the two CSS :target dialogs (the filter drawer and admin setup).
 */
import { config } from "../core/config";
import { announceStatus, bindActions, byId, errorMessage, loadPageElements, optionalById, toTone } from "../dom";
import {
  escapeHtml,
  getStatusMeta,
  renderComments,
  renderIssueImage,
  safeDomId
} from "../components/issue-renderers";
import {
  renderStaffIssueCard,
  renderStaffIssueDetailModal
} from "../components/dashboard-renderers";
import type {
  Comment,
  Governorate,
  Issue,
  IssueStatus,
  StatusUpdate
} from "../models";
import type { DashboardService, StaffDashboardData } from "../services/dashboard.service";
import type { SessionService } from "../services/session.service";
import { formString } from "../text";
import { filterIssues } from "../issue-filters";
import { parseApiDate } from "../date";
import * as feedback from "../components/feedback";
import {
  countTo,
  pulse,
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
import { mountMapsIn } from "../components/map";

const FILTER_LABELS = {
  search: "Search",
  status: "Status",
  priority: "Priority",
  department: "Dept",
  category: "Category",
  sort: "Sort"
};
type FilterKey = keyof typeof FILTER_LABELS;
type Filters = Record<FilterKey, string>;
const FILTER_KEYS = Object.keys(FILTER_LABELS) as FilterKey[];

interface ActiveFilter {
  key: FilterKey;
  label: string;
  value: string;
}

interface DashboardElements {
  list: HTMLElement;
  detailHost: HTMLElement;
  resultSummary: HTMLElement | null;
  pageStatus: HTMLElement;
  filters: { search: HTMLInputElement } & Record<Exclude<FilterKey, "search">, HTMLSelectElement>;
  activeFiltersPanel: HTMLElement | null;
  activeFilterChips: HTMLElement;
  filterCount: HTMLElement | null;
  regionForm: HTMLFormElement;
  departmentForm: HTMLFormElement;
  categoryForm: HTMLFormElement;
  adminStatus: HTMLElement;
  adminRegionSelect: HTMLSelectElement;
  adminDepartmentSelect: HTMLSelectElement;
}

/** A CSS :target dialog and the control that should regain focus on close. */
interface CssDialogContext {
  dialog: HTMLElement;
  focusTarget: HTMLElement;
  trigger: HTMLElement | null;
}

const STATUS_RADIO_MAP: Record<string, string> = {
  staffIssueFilterTotal: "",
  staffIssueFilterOpen: "Open",
  staffIssueFilterProgress: "InProgress",
  staffIssueFilterResolved: "Resolved"
};

const ADMIN_DIALOG_TARGETS = [
  "adminManagement",
  "adminRegionPanel",
  "adminDepartmentPanel",
  "adminCategoryPanel"
];

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(", ");

function emptyFilters(): Filters {
  return { search: "", sort: "newest", status: "", priority: "", department: "", category: "" };
}

export class DashboardPage {
  private elements!: DashboardElements;
  private dashboard: StaffDashboardData | null = null;
  private filters: Filters = emptyFilters();
  private openIssueId: number | null = null;
  private openIssueTrigger: HTMLElement | null = null;
  private searchTimer = 0;
  private readonly busy = { detail: false, status: false, comment: false, setup: false };
  /** Lazily loads card thumbnails; the list has no attachments of its own. */
  private imageHydrator: IssueImageHydrator | null = null;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly session: SessionService
  ) {}

  private cacheElements(): DashboardElements {
    return {
      list: byId<HTMLElement>("issuesAccordion"),
      detailHost: byId<HTMLElement>("issueDetailModalHost"),
      resultSummary: optionalById<HTMLElement>("issuesResultSummary"),
      pageStatus: byId<HTMLElement>("dashboardPageStatus"),
      filters: {
        search: byId<HTMLInputElement>("searchInput"),
        sort: byId<HTMLSelectElement>("sortFilter"),
        status: byId<HTMLSelectElement>("statusFilter"),
        priority: byId<HTMLSelectElement>("priorityFilter"),
        department: byId<HTMLSelectElement>("deptFilter"),
        category: byId<HTMLSelectElement>("categoryFilter")
      },
      activeFiltersPanel: optionalById<HTMLElement>("activeFiltersPanel"),
      activeFilterChips: byId<HTMLElement>("activeFilterChips"),
      filterCount: optionalById<HTMLElement>("dashboardFilterCount"),
      regionForm: byId<HTMLFormElement>("adminRegionForm"),
      departmentForm: byId<HTMLFormElement>("adminDepartmentForm"),
      categoryForm: byId<HTMLFormElement>("adminCategoryForm"),
      adminStatus: byId<HTMLElement>("adminManagementStatus"),
      adminRegionSelect: byId<HTMLSelectElement>("adminDepartmentRegion"),
      adminDepartmentSelect: byId<HTMLSelectElement>("adminCategoryDepartment")
    };
  }

  private findIssue(issueId: number): Issue | null {
    return findIssueById(this.dashboard?.issues, issueId);
  }

  /** Replaces one card's media element in place, without re-rendering the list. */
  private refreshIssueCardImage(issue: Issue | null): void {
    refreshCardImage(this.elements.list, issue);
  }

  private hydrateVisibleIssueImages(): void {
    this.imageHydrator ??= new IssueImageHydrator({
      list: this.elements.list,
      cardSelector: ".issue-card[data-issue-id]",
      findIssue: (issueId) => this.findIssue(issueId),
      fetchAttachments: (issueId) => this.dashboardService.getStaffIssueAttachments(issueId),
      onLoaded: (issue, attachments) => {
        this.refreshIssueCardImage(applyAttachmentsToIssue(issue, attachments));
      }
    });
    this.imageHydrator.observe();
  }

  private get loaded(): StaffDashboardData {
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

  private setAdminStatus(message: string, tone?: string): void {
    announceStatus(this.elements.adminStatus, message, tone, "mb-3");
    if (!message) {
      this.elements.adminStatus.className = "d-none";
    }
  }

  /**
   * Notification deep links are one-time navigation instructions; dropping
   * issueId after use stops an old issue reopening on refresh.
   */
  private replaceHistoryWithoutIssueId(anchor?: string): void {
    const url = new URL(window.location.href);
    url.searchParams.delete("issueId");
    url.hash = anchor ? `#${anchor}` : "";
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  /** Copy and visibility differ by role without changing the page structure. */
  private applyRolePresentation(): void {
    const user = this.loaded.currentUser;
    const isAdmin = user.role === "Admin";
    const roleLabel = isAdmin ? "Admin" : "Staff";

    document.querySelectorAll<HTMLElement>("[data-admin-only]").forEach((element) => {
      element.hidden = !isAdmin;
    });

    [this.elements.regionForm, this.elements.departmentForm, this.elements.categoryForm].forEach(
      (form) => {
        const controls = [
          form.querySelector("fieldset"), form.querySelector<HTMLButtonElement>('[type="submit"]')
        ];
        controls.forEach((control) => {
          if (control) control.disabled = !isAdmin;
        });
      }
    );

    const roleKicker = optionalById<HTMLElement>("dashboardRoleKicker");
    const workspaceKicker = optionalById<HTMLElement>("dashboardWorkspaceKicker");
    const heroCopy = optionalById<HTMLElement>("dashboardHeroCopy");
    const workspaceCopy = optionalById<HTMLElement>("dashboardWorkspaceCopy");

    // Only the trailing text node changes - the leading icon element stays.
    if (roleKicker?.lastChild) {
      roleKicker.lastChild.textContent = ` ${roleLabel} dashboard`;
    }
    if (workspaceKicker?.lastChild) {
      workspaceKicker.lastChild.textContent = ` ${roleLabel} Workspace`;
    }
    if (heroCopy) {
      heroCopy.textContent = isAdmin
        ? "Manage service structure, review civic issues and keep citizens informed from first assessment to resolution."
        : "Review civic issues, document municipal action and keep citizens informed from first assessment to resolution.";
    }
    if (workspaceCopy) {
      workspaceCopy.textContent = isAdmin
        ? "Manage platform setup, review civic issues, update their status, and respond to citizen comments."
        : "Review civic issues, update their status, and respond to citizen comments.";
    }

    // A Staff user must not sit on an admin :target dialog.
    if (!isAdmin && /^#admin(?:Management|Region|Department|Category)/.test(window.location.hash)) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#issuesAccordion`
      );
    }
  }

  private timeZoneDateKey(value: string | Date): string {
    const date =
      value instanceof Date ? value : parseApiDate(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: config.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(date);
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }

  private renderAccountAndHero(): void {
    const dashboard = this.loaded;
    const issues = dashboard.issues;
    const unreadCount = dashboard.notifications.filter((n) => !n.isRead).length;
    const openCount = issues.filter((issue) => issue.currentStatus === "Open").length;
    const progressCount = issues.filter((issue) => issue.currentStatus === "InProgress").length;
    const today = this.timeZoneDateKey(new Date());
    const resolvedToday = dashboard.statusUpdates.filter(
      (update) =>
        update.newStatus === "Resolved" && this.timeZoneDateKey(update.updatedAt) === today
    ).length;

    // Header identity is the shared site-session component's job on every
    // page; writing it here too would mean two owners for one element.
    countTo(optionalById<HTMLElement>("dashboardHeroAssigned"), issues.length, {
      format: (value) => `${Math.round(value)} issue${Math.round(value) === 1 ? "" : "s"}`
    });
    countTo(optionalById<HTMLElement>("dashboardHeroResolvedToday"), resolvedToday, {
      format: (value) => `${Math.round(value)} resolved`
    });

    const workload = optionalById<HTMLElement>("dashboardHeroWorkloadCopy");
    if (workload) {
      if (!issues.length) {
        workload.textContent = "There are no issues waiting for action.";
      } else if (!openCount && !progressCount) {
        workload.textContent = "All issues are resolved.";
      } else {
        const parts = [
          openCount && `${openCount} open issue${openCount === 1 ? "" : "s"} need${openCount === 1 ? "s" : ""} triage`,
          progressCount && `${progressCount} field task${progressCount === 1 ? " is" : "s are"} in progress`
        ].filter(Boolean);
        workload.textContent = `${parts.join(" and ")}.`;
      }
    }

    const notificationCount = optionalById<HTMLElement>("dashboardNotificationCount");
    if (notificationCount) {
      notificationCount.textContent = String(unreadCount);
      notificationCount.hidden = unreadCount === 0;
      notificationCount.setAttribute(
        "aria-label",
        `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
      );
      pulse(notificationCount, unreadCount);
    }
  }

  private renderStatistics(): void {
    const issues = this.loaded.issues;
    const counts: Record<string, number> = {
      Total: issues.length,
      Open: issues.filter((issue) => issue.currentStatus === "Open").length,
      Progress: issues.filter((issue) => issue.currentStatus === "InProgress").length,
      Resolved: issues.filter((issue) => issue.currentStatus === "Resolved").length
    };

    Object.entries(counts).forEach(([key, value]) => {
      countTo(optionalById<HTMLElement>(`issueStat${key}`), value);
    });
  }

  private replaceSelectOptions<T>(
    select: HTMLSelectElement,
    placeholder: string,
    items: T[],
    valueFor: (item: T) => string | number,
    labelFor: (item: T) => string
  ): void {
    const previousValue = select.value;
    const fragment = document.createDocumentFragment();
    const placeholderOption = new Option(placeholder, "");
    placeholderOption.disabled = select.required;
    placeholderOption.selected = true;
    fragment.append(placeholderOption);

    items.forEach((item) => fragment.append(new Option(labelFor(item), String(valueFor(item)))));
    select.replaceChildren(fragment);
    if ([...select.options].some((option) => option.value === previousValue)) {
      select.value = previousValue;
    }
  }

  private renderLookupOptions(): void {
    const departments = this.loaded.departments
      .slice()
      .sort((left, right) => left.departmentName.localeCompare(right.departmentName));
    const categories = this.loaded.categories
      .slice()
      .sort((left, right) => left.categoryName.localeCompare(right.categoryName));
    const regions = this.loaded.regions
      .slice()
      .sort((left, right) => left.regionName.localeCompare(right.regionName));

    this.replaceSelectOptions(
      this.elements.filters.department,
      "All Departments",
      departments,
      (department) => department.departmentName,
      (department) => department.departmentName
    );
    this.replaceSelectOptions(
      this.elements.filters.category,
      "All Categories",
      categories,
      (category) => category.categoryName,
      (category) => category.categoryName
    );
    this.replaceSelectOptions(
      this.elements.adminRegionSelect,
      "Select a region",
      regions,
      (region) => region.regionId,
      (region) => `${region.regionName} — ${region.governorate}`
    );
    this.replaceSelectOptions(
      this.elements.adminDepartmentSelect,
      "Select a department",
      departments,
      (department) => department.departmentId,
      (department) => department.departmentName
    );
  }

  private getVisibleIssues(): Issue[] {
    return filterIssues(this.loaded.issues, this.filters, true);
  }

  private renderIssues(): void {
    const issues = this.loaded.issues;
    const visible = this.getVisibleIssues();
    this.elements.list.setAttribute("aria-busy", "true");

    if (!issues.length) {
      this.elements.list.innerHTML = `
        <div class="ocsp-card p-4 text-center" role="status">
          <i class="bi bi-inboxes fs-2 text-primary" aria-hidden="true"></i>
          <h3 class="h5 mt-3">No issues</h3>
          <p class="text-muted mb-0">New civic reports will appear here when they are available.</p>
        </div>`;
    } else if (!visible.length) {
      this.elements.list.innerHTML = `
        <div class="ocsp-card p-4 text-center" role="status">
          <i class="bi bi-search fs-2 text-primary" aria-hidden="true"></i>
          <h3 class="h5 mt-3">No matching issues</h3>
          <p class="text-muted mb-3">Try changing your search or filters.</p>
          <button class="ocsp-button ocsp-button--cancel" type="button" data-action="clear-filters">Clear filters</button>
        </div>`;
    } else {
      this.elements.list.innerHTML = visible.map((issue) => renderStaffIssueCard(issue)).join("");
    }

    if (this.elements.resultSummary) {
      this.elements.resultSummary.textContent = issues.length
        ? `Showing ${visible.length} of ${issues.length} issue${issues.length === 1 ? "" : "s"}.`
        : "No issues are available.";
    }
    this.elements.list.setAttribute("aria-busy", "false");

    // Stagger only the first paint; a later render is a filter, not an entrance.
    const firstRender = this.elements.list.dataset.ocspMotionRendered !== "true";
    revealList(this.elements.list, '.issue-card, .ocsp-card[role="status"], .alert', {
      stagger: firstRender,
      interval: firstRender ? 36 : 0,
      duration: firstRender ? 240 : 160,
      distance: firstRender ? 12 : 6
    });
    this.elements.list.dataset.ocspMotionRendered = "true";

    this.hydrateVisibleIssueImages();
  }

  private activeFilterDefinitions(): ActiveFilter[] {
    const filters = this.filters;
    const values: Filters = {
      ...filters,
      search: filters.search.trim(),
      status: filters.status ? getStatusMeta(filters.status).label : "",
      sort: filters.sort === "newest" ? "" : "Oldest First"
    };
    return FILTER_KEYS.filter((key) => values[key]).map((key) => ({
      key,
      label: FILTER_LABELS[key],
      value: values[key]
    }));
  }

  private renderActiveFilters(): void {
    const filters = this.activeFilterDefinitions();

    if (this.elements.filterCount) {
      this.elements.filterCount.textContent = String(filters.length);
      this.elements.filterCount.hidden = filters.length === 0;
    }
    if (this.elements.activeFiltersPanel) {
      this.elements.activeFiltersPanel.hidden = filters.length === 0;
    }

    this.elements.activeFilterChips.innerHTML = filters
      .map(
        (filter) => `
      <span class="badge bg-white text-dark border shadow-sm rounded-pill d-inline-flex align-items-center gap-2 px-3 py-2 fw-semibold fs-6">
        <span class="text-muted fw-normal">${escapeHtml(filter.label)}:</span>
        ${escapeHtml(filter.value)}
        <button class="btn-close ms-1 active-filter__dismiss" type="button" data-action="remove-filter" data-filter="${escapeHtml(filter.key)}" aria-label="Remove ${escapeHtml(filter.label)} filter"></button>
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
    for (const key of FILTER_KEYS) {
      const control = this.elements.filters[key];
      if (control.value !== filters[key]) {
        control.value = filters[key];
      }
    }

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
    this.applyRolePresentation();
    this.renderAccountAndHero();
    this.renderStatistics();
    this.renderLookupOptions();
    this.renderFilteredContent();
  }

  private clearFilters(focusSearch: boolean): void {
    window.clearTimeout(this.searchTimer);
    this.filters = emptyFilters();
    this.renderFilteredContent();
    if (focusSearch) {
      requestAnimationFrame(() => this.elements.filters.search.focus());
    }
  }

  private removeFilter(key: string): void {
    if (!(key in this.filters)) {
      return;
    }
    const filterKey = key as FilterKey;
    this.filters[filterKey] = filterKey === "sort" ? "newest" : "";
    this.renderFilteredContent();
  }

  private applyDrawerFilters = (): void => {
    for (const key of FILTER_KEYS) {
      if (key !== "search") {
        this.filters[key] = this.elements.filters[key].value;
      }
    }
    this.renderFilteredContent();
    window.location.hash = "dashboardFilterTrigger";
    optionalById<HTMLElement>("dashboardFilterTrigger")?.focus();
  };

  /** Fetched only when opened, so the list does not make one request per card. */
  private async showIssueDetails(issueId: number, trigger: HTMLElement | null): Promise<void> {
    if (this.busy.detail || !Number.isInteger(issueId) || issueId < 1) {
      return;
    }

    const requestHash = window.location.hash;
    this.busy.detail = true;
    this.openIssueTrigger = trigger ?? (document.activeElement as HTMLElement | null);
    trigger?.setAttribute("aria-busy", "true");
    this.setPageStatus("");

    try {
      const issue = await this.dashboardService.getStaffIssueDetails(issueId);

      // A navigation during the request makes its result stale; ignoring it
      // stops Back or another dialog being overridden when it lands.
      if (window.location.hash !== requestHash) {
        this.openIssueTrigger = null;
        return;
      }

      this.openIssueId = issueId;
      this.elements.detailHost.innerHTML = renderStaffIssueDetailModal(issue);
      revealWithin(this.elements.detailHost, { interval: 45, distance: 8 });

      // Only when the request actually succeeded - a failed optional
      // attachments call must not wipe a preview the card already loaded.
      if (!issue.warnings.includes("attachments")) {
        this.refreshIssueCardImage(
          applyAttachmentsToIssue(this.findIssue(issueId), issue.attachments)
        );
      }
      const modalAnchor = `issueModal-${safeDomId(issueId)}`;
      const isDeepLink = new URLSearchParams(window.location.search).has("issueId");

      // Deep links are consumed in one history update; an ordinary card open
      // still creates a Back entry for the dialog.
      if (isDeepLink) {
        this.replaceHistoryWithoutIssueId(modalAnchor);
      } else {
        window.location.hash = modalAnchor;
      }

      requestAnimationFrame(() => {
        optionalById<HTMLElement>(modalAnchor)?.focus();
        // The dialog is CSS :target driven, so there is no shown event - by
        // this frame the hash is applied and the element has a real size.
        void mountMapsIn(this.elements.detailHost);
      });
    } catch (error) {
      this.openIssueId = null;
      this.openIssueTrigger = null;
      this.elements.detailHost.replaceChildren();
      this.setPageStatus(errorMessage(error, "The issue details could not be loaded."), "danger");
    } finally {
      this.busy.detail = false;
      trigger?.removeAttribute("aria-busy");
    }
  }

  private closeIssueDetails(restoreFocus = true, updateUrl = true): void {
    const trigger = this.openIssueTrigger;
    const targetId = trigger?.id || "issuesAccordion";
    this.openIssueId = null;
    this.openIssueTrigger = null;

    // An explicit close consumes the modal URL. A Back-button close must not,
    // because the browser has already selected the destination entry.
    if (updateUrl) {
      this.replaceHistoryWithoutIssueId(targetId);
    }
    this.elements.detailHost.replaceChildren();
    if (restoreFocus && trigger?.isConnected) {
      trigger.focus();
    }
  }

  private async changeStatus(form: HTMLFormElement): Promise<void> {
    if (this.busy.status || !form.reportValidity()) {
      return;
    }

    const issueId = Number(form.dataset.issueId);
    const formData = new FormData(form);
    const payload = {
      newStatus: formString(formData, "newStatus") as IssueStatus,
      notes: formString(formData, "notes").trim() || null
    };
    const submitButton = form.querySelector<HTMLButtonElement>('[type="submit"]');
    const status = form.querySelector<HTMLElement>("[data-status-action-status]");
    if (!submitButton || !status) {
      return;
    }

    this.busy.status = true;
    form.setAttribute("aria-busy", "true");
    setButtonBusy(submitButton, true, "Updating status...");
    status.textContent = "Updating status...";

    try {
      const response = await this.dashboardService.changeIssueStatus(issueId, payload);
      const raw = response as Partial<StatusUpdate> | null;
      const update: StatusUpdate = {
        statusUpdateId: raw?.statusUpdateId ?? 0,
        issueId: Number(raw?.issueId ?? issueId),
        updatedById: raw?.updatedById ?? this.loaded.currentUser.userId,
        previousStatus: raw?.previousStatus ?? payload.newStatus,
        newStatus: raw?.newStatus ?? payload.newStatus,
        notes: raw?.notes === undefined ? payload.notes : raw.notes,
        updatedAt: raw?.updatedAt ?? new Date().toISOString()
      };

      const issue = this.findIssue(issueId);
      if (issue) {
        issue.currentStatus = update.newStatus;
      }

      // The write succeeded, so update the local view rather than making a
      // second request that could make a saved change look like a failure.
      const updateId = Number(update.statusUpdateId);
      this.loaded.statusUpdates = [
        update,
        ...this.loaded.statusUpdates.filter(
          (item) => !updateId || Number(item.statusUpdateId) !== updateId
        )
      ];

      this.openIssueId = null;
      this.openIssueTrigger = null;
      this.elements.detailHost.replaceChildren();
      this.replaceHistoryWithoutIssueId("issuesAccordion");
      this.renderAccountAndHero();
      this.renderStatistics();
      this.renderFilteredContent();
      // The toast is the confirmation; leaving the page region empty stops the
      // same sentence appearing twice on screen.
      this.setPageStatus("");
      feedback.success("The issue status was updated successfully.");

      (this.triggerForIssue(issueId) ?? this.elements.filters.search).focus();
    } catch (error) {
      const message = errorMessage(error, "The issue status could not be updated.");
      status.textContent = message;
      feedback.error(message, { announce: false });
    } finally {
      this.busy.status = false;
      form.removeAttribute("aria-busy");
      setButtonBusy(submitButton, false);
    }
  }

  private async addStaffComment(form: HTMLFormElement): Promise<void> {
    if (this.busy.comment || !form.reportValidity()) {
      return;
    }

    const issueId = Number(form.dataset.issueId);
    const input = form.querySelector<HTMLInputElement>("[data-comment-input]");
    const submitButton = form.querySelector<HTMLButtonElement>('[type="submit"]');
    const status = form.parentElement?.querySelector<HTMLElement>("[data-comment-status]");
    const thread = form.parentElement?.querySelector<HTMLElement>("[data-comment-thread]");
    if (!input || !submitButton || !status || !thread) {
      return;
    }

    const content = input.value.trim();
    if (!content) {
      input.focus();
      return;
    }

    this.busy.comment = true;
    form.setAttribute("aria-busy", "true");
    input.disabled = true;
    setButtonBusy(submitButton, true, "Adding comment...");
    status.textContent = "Adding comment...";

    try {
      const response = await this.dashboardService.addStaffComment(issueId, content);
      const currentUser = this.loaded.currentUser;
      const comment: Comment = {
        commentId: response?.commentId ?? 0,
        issueId: response?.issueId ?? issueId,
        userId: response?.userId ?? currentUser.userId,
        userName: response?.userName ?? currentUser.name ?? "Staff",
        content: response?.content ?? content,
        isStaffComment: response?.isStaffComment ?? true,
        commentDate: response?.commentDate ?? new Date().toISOString()
      };

      thread.querySelector("[data-empty-comments]")?.remove();
      thread.insertAdjacentHTML("beforeend", renderComments([comment]));
      revealList(thread, ".comment-card", { stagger: false, duration: 220, distance: 7 });
      input.value = "";
      status.textContent = "Comment added.";
      feedback.success("Comment added.", { announce: false });
    } catch (error) {
      const message = errorMessage(error, "The comment could not be added.");
      status.textContent = message;
      feedback.error(message, { announce: false });
    } finally {
      this.busy.comment = false;
      form.removeAttribute("aria-busy");
      input.disabled = false;
      setButtonBusy(submitButton, false);
      input.focus();
    }
  }

  /** Keep each setup payload beside the lookup collection its result updates. */
  private adminRequest(form: HTMLFormElement): { label: string; save: () => Promise<void> } {
    const data = new FormData(form);
    const text = (key: string) => formString(data, key).trim();

    if (form === this.elements.regionForm) {
      return {
        label: "Region",
        save: async () => {
          const created = await this.dashboardService.createRegion({
            regionName: text("regionName"),
            governorate: formString(data, "governorate") as Governorate
          });
          this.loaded.regions = [...this.loaded.regions, created];
        }
      };
    }
    if (form === this.elements.departmentForm) {
      return {
        label: "Department",
        save: async () => {
          const created = await this.dashboardService.createDepartment({
            departmentName: text("departmentName"),
            contactEmail: text("contactEmail"),
            description: text("description") || null,
            regionId: data.get("regionId") ? Number(data.get("regionId")) : null
          });
          this.loaded.departments = [...this.loaded.departments, created];
        }
      };
    }
    return {
      label: "Category",
      save: async () => {
        const created = await this.dashboardService.createCategory({
          categoryName: text("categoryName"),
          description: text("description") || null,
          departmentId: Number(data.get("departmentId"))
        });
        this.loaded.categories = [...this.loaded.categories, created];
      }
    };
  }

  private async submitAdminForm(form: HTMLFormElement): Promise<void> {
    if (this.loaded.currentUser.role !== "Admin") {
      this.setAdminStatus("Only an Admin can change platform setup.", "danger");
      return;
    }
    if (this.busy.setup || !form.reportValidity()) {
      return;
    }

    const request = this.adminRequest(form);
    const submitButton = form.querySelector<HTMLButtonElement>('[type="submit"]');
    if (!submitButton) {
      return;
    }

    this.busy.setup = true;
    form.setAttribute("aria-busy", "true");
    setButtonBusy(submitButton, true, `Adding ${request.label.toLocaleLowerCase()}...`);
    this.setAdminStatus(`Adding ${request.label.toLocaleLowerCase()}...`, "info");

    try {
      // Creation has already succeeded by the time we update lookup state, so a
      // later refresh problem can never turn into a duplicate POST.
      await request.save();

      form.reset();
      this.renderLookupOptions();
      this.setAdminStatus(`${request.label} added successfully.`, "success");
    } catch (error) {
      this.setAdminStatus(
        errorMessage(error, `The ${request.label.toLocaleLowerCase()} could not be added.`),
        "danger"
      );
      this.elements.adminStatus.focus();
    } finally {
      this.busy.setup = false;
      form.removeAttribute("aria-busy");
      setButtonBusy(submitButton, false);
    }
  }

  /** One trap serves all dialogs; CSS-hidden controls cannot receive focus. */
  private trapDialogFocus(event: KeyboardEvent, dialog: HTMLElement): void {
    const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
      (element) => !element.hidden && element.getClientRects().length > 0
    );
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const activeIsBoundary = active === dialog || !active || !focusable.includes(active);

    if (active === (event.shiftKey ? first : last) || activeIsBoundary) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  }

  private currentCssDialog(): CssDialogContext | null {
    const targetId = window.location.hash.replace(/^#/, "");

    const isFilter = targetId === "filterDrawer";
    if (!isFilter && !ADMIN_DIALOG_TARGETS.includes(targetId)) {
      return null;
    }

    const dialog = optionalById<HTMLElement>(isFilter ? "filterDrawer" : "adminManagement");
    if (!dialog || (!isFilter && dialog.hidden)) {
      return null;
    }
    return {
      dialog,
      focusTarget: optionalById<HTMLElement>(targetId) ?? dialog,
      trigger: optionalById<HTMLElement>(isFilter ? "dashboardFilterTrigger" : "adminManagementTrigger")
    };
  }

  private focusCssDialog(context: CssDialogContext): void {
    requestAnimationFrame(() => context.focusTarget.focus());
  }

  private closeCssDialog(context: CssDialogContext): void {
    if (!context.trigger) {
      return;
    }
    const trigger = context.trigger;
    this.replaceHistoryWithoutIssueId(trigger.id);
    requestAnimationFrame(() => trigger.focus());
  }

  private bindFilterEvents(): void {
    this.elements.filters.search.addEventListener("input", (event) => {
      window.clearTimeout(this.searchTimer);
      const value = (event.target as HTMLInputElement).value;
      this.searchTimer = window.setTimeout(() => {
        this.filters.search = value;
        this.renderFilteredContent();
      }, 150);
    });

    Object.entries(STATUS_RADIO_MAP).forEach(([id, status]) => {
      optionalById<HTMLInputElement>(id)?.addEventListener("change", (event) => {
        if ((event.target as HTMLInputElement).checked) {
          this.filters.status = status;
          this.renderFilteredContent();
        }
      });
    });

    optionalById<HTMLElement>("resetFiltersButton")?.addEventListener("click", () => {
      this.clearFilters(false);
    });
    optionalById<HTMLElement>("clearAllFiltersButton")?.addEventListener("click", () => {
      this.clearFilters(true);
    });
    optionalById<HTMLElement>("applyFiltersButton")?.addEventListener(
      "click",
      this.applyDrawerFilters
    );
  }

  private bindDelegatedEvents(): void {
    bindActions(this.elements.list, "click", {
      "open-issue": (trigger, event) => {
        event.preventDefault();
        return this.showIssueDetails(Number(trigger.dataset.issueId), trigger);
      },
      "clear-filters": () => this.clearFilters(true),
      "retry-dashboard": () => this.loadDashboard()
    });
    bindActions(this.elements.activeFilterChips, "click", {
      "remove-filter": (trigger) => {
        if (trigger.dataset.filter) this.removeFilter(trigger.dataset.filter);
      }
    });
    bindActions(this.elements.detailHost, "click", {
      "close-issue": (_trigger, event) => {
        event.preventDefault();
        this.closeIssueDetails(true);
      }
    });
    bindActions<HTMLFormElement>(this.elements.detailHost, "submit", {
      "change-status": (form) => this.changeStatus(form),
      "add-staff-comment": (form) => this.addStaffComment(form)
    });

    document.addEventListener("keydown", (event) => {
      const issueDialog = this.openIssueId
        ? optionalById<HTMLElement>(`issueModal-${safeDomId(this.openIssueId)}`)
        : null;

      const dialogContext = issueDialog ? null : this.currentCssDialog();
      const dialog = issueDialog ?? dialogContext?.dialog;
      if (!dialog) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (issueDialog) {
          this.closeIssueDetails(true);
        } else if (dialogContext) {
          this.closeCssDialog(dialogContext);
        }
      } else if (event.key === "Tab") {
        this.trapDialogFocus(event, dialog);
      }
    });

    window.addEventListener("hashchange", () => {
      let closedIssueFromHistory = false;

      if (
        this.openIssueId &&
        window.location.hash !== `#issueModal-${safeDomId(this.openIssueId)}`
      ) {
        this.closeIssueDetails(true, false);
        closedIssueFromHistory = true;
      }

      // A Forward navigation back to an issue hash restores its lazy dialog.
      if (!this.openIssueId && this.issueIdFromHash()) {
        void this.openIssueFromHash();
        return;
      }

      const dialogContext = this.currentCssDialog();
      if (dialogContext) {
        this.focusCssDialog(dialogContext);
        return;
      }

      if (closedIssueFromHistory) {
        return;
      }
      const restoredId = window.location.hash.slice(1);
      if (["adminManagementTrigger", "dashboardFilterTrigger"].includes(restoredId)) {
        const trigger = optionalById<HTMLElement>(restoredId);
        if (trigger) {
          requestAnimationFrame(() => trigger.focus());
        }
      }
    });
  }

  /**
   * A citizen's image URL points at a host we do not control, so it can expire
   * or turn out not to be an image at all. Swap the broken <img> for the same
   * "No preview" card the renderer produces when there is no image.
   *
   * Listens in the CAPTURE phase: the error event on an <img> does not bubble.
   */
  private bindImageFallback(): void {
    this.elements.list.addEventListener(
      "error",
      (event) => {
        const image = event.target;
        if (!(image instanceof HTMLImageElement) || !image.matches(".issue-card-media__image")) {
          return;
        }

        const card = image.closest<HTMLElement>("[data-issue-id]");
        const media = image.closest(".issue-card-media");
        const issue = card ? this.findIssue(Number(card.dataset.issueId)) : null;
        if (!issue || !media) {
          return;
        }

        issue.ui = { ...issue.ui };
        delete issue.ui.imageUrl;
        delete issue.ui.imageAlt;
        media.outerHTML = renderIssueImage(issue);
      },
      true
    );
  }

  private bindAdminEvents(): void {
    [this.elements.regionForm, this.elements.departmentForm, this.elements.categoryForm].forEach(
      (form) => {
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          void this.submitAdminForm(form);
        });
      }
    );
  }

  private issueIdFromHash(): number | null {
    const match = /^#issueModal-(\d+)$/.exec(window.location.hash);
    return match?.[1] ? Number(match[1]) : null;
  }

  private async openIssueFromHash(): Promise<void> {
    const issueId = this.issueIdFromHash();
    if (!issueId || this.openIssueId || this.busy.detail || !this.dashboard) {
      return;
    }

    if (!this.findIssue(issueId)) {
      this.setPageStatus("The linked issue could not be found.", "warning");
      this.replaceHistoryWithoutIssueId("issuesAccordion");
      return;
    }

    await this.showIssueDetails(issueId, this.triggerForIssue(issueId));
  }

  private triggerForIssue(issueId: number): HTMLElement | null {
    return this.elements.list.querySelector<HTMLElement>(
      `[data-action="open-issue"][data-issue-id="${safeDomId(issueId)}"]`
    );
  }

  private async openLinkedIssueFromUrl(): Promise<void> {
    const rawIssueId = new URLSearchParams(window.location.search).get("issueId");
    if (!rawIssueId) {
      return;
    }

    const issueId = Number(rawIssueId);
    const exists =
      Number.isInteger(issueId) &&
      issueId > 0 &&
      this.findIssue(issueId);

    if (!exists) {
      this.setPageStatus("The linked issue could not be found.", "warning");
      this.replaceHistoryWithoutIssueId("issuesAccordion");
      return;
    }

    await this.showIssueDetails(issueId, this.triggerForIssue(issueId));
  }

  private loadDashboard = async (): Promise<void> => {
    renderSkeletons(this.elements.list, {
      count: 3,
      variant: "issue",
      label: "Loading issues..."
    });

    try {
      this.dashboard = await this.dashboardService.getStaffDashboardData();
      this.renderDashboard();

      await this.openLinkedIssueFromUrl();
      if (!this.openIssueId) {
        await this.openIssueFromHash();
      }

      const warnings = this.loaded.warnings;
      if (warnings.length) {
        this.setPageStatus(
          `Some supporting dashboard data could not be loaded: ${warnings.join(", ")}.`,
          "warning"
        );
      }
    } catch (error) {
      const message = errorMessage(error, "The dashboard could not be loaded.");
      feedback.error(message, { announce: false });
      this.elements.list.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <p class="mb-3">${escapeHtml(message)}</p>
          <button class="ocsp-button ocsp-button--submit" type="button" data-action="retry-dashboard">Try again</button>
        </div>`;
      this.elements.list.setAttribute("aria-busy", "false");
    }
  };

  start(): void {
    const elements = loadPageElements(
      () => this.cacheElements(), "dashboardPageStatus", "The dashboard could not start.", "mb-4"
    );
    if (!elements) return;
    this.elements = elements;

    this.bindFilterEvents();
    this.bindDelegatedEvents();
    this.bindImageFallback();
    this.bindAdminEvents();

    // A flash set before a redirect is consumed here rather than after the
    // data loads, so it is shown even if the dashboard request then fails.
    const flash = this.session.consumeFlash();
    if (flash?.message) {
      // Toast only. A flash is a note about the PREVIOUS page - showing it in
      // the page's own status region as well reads as a second, stuck message.
      feedback.show(flash.message, { tone: toTone(flash.tone) });
    }

    // The filter drawer is visible from its initial :target before data loads,
    // so move focus now rather than waiting on the network.
    const initialDialogContext = this.currentCssDialog();
    if (initialDialogContext) {
      this.focusCssDialog(initialDialogContext);
    }

    void this.loadDashboard().then(() => {
      // Admin setup only becomes focusable once role rendering has removed
      // its hidden attribute.
      const revealed = this.currentCssDialog();
      if (revealed && (!initialDialogContext || revealed.dialog !== initialDialogContext.dialog)) {
        this.focusCssDialog(revealed);
      }
    });
  }
}
