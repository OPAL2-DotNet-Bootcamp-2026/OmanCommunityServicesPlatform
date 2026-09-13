/**
 * The citizen portal: issue list, filters, create-issue dialog, detail modal
 * with comments and ratings.
 */
import { byId, errorMessage, optionalById, setAlert } from "../dom";
import {
  escapeHtml,
  getInitials,
  getStatusMeta,
  renderComments,
  renderIssueCard,
  renderIssueDetailModal,
  safeDomId
} from "../components/issue-renderers";
import type { Category, Comment, CreateIssueRequest, Issue, Rating } from "../models";
import type { CitizenDashboardData, DataService } from "../services/data.service";
import { formString } from "../text";
import { mountMapsIn, setMapPin, type MapPickDetail } from "../components/map";

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
  issueGovernorate: HTMLInputElement;
  issueLatitude: HTMLInputElement;
  issueLongitude: HTMLInputElement;
  locationButton: HTMLButtonElement;
  locationStatus: HTMLElement;
  pageStatus: HTMLElement;
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

function normalizedSearchText(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase();
}

export class MyIssuesPage {
  private elements!: MyIssuesElements;
  private dashboard: CitizenDashboardData | null = null;
  private filters: Filters = emptyFilters();
  private openIssueTrigger: HTMLElement | null = null;
  private searchTimer = 0;

  constructor(private readonly data: DataService) {}

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
      issueGovernorate: byId<HTMLInputElement>("issueGovernorate"),
      issueLatitude: byId<HTMLInputElement>("issueLatitude"),
      issueLongitude: byId<HTMLInputElement>("issueLongitude"),
      locationButton: byId<HTMLButtonElement>("useCurrentLocation"),
      locationStatus: byId<HTMLElement>("locationStatus"),
      pageStatus: byId<HTMLElement>("pageStatus")
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
    setAlert(this.elements.pageStatus, message, tone, "mb-4");
    if (!message) {
      this.elements.pageStatus.className = "d-none";
    }
  }

  private setCreateIssueStatus(message: string, tone?: string): void {
    setAlert(this.elements.createIssueStatus, message, tone, "mb-3");
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
    const search = normalizedSearchText(filters.search);

    const issues = this.loaded.issues.filter((issue) => {
      const searchableText = normalizedSearchText(
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

  private async showIssueDetails(issueId: number, trigger: HTMLElement | null): Promise<void> {
    this.setPageStatus("");
    this.openIssueTrigger = trigger ?? (document.activeElement as HTMLElement | null);

    try {
      const issue = await this.data.getIssueDetails(issueId);
      this.elements.detailHost.innerHTML = renderIssueDetailModal(issue);
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
      input.value = "";
      status.textContent = "Comment added.";
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

  private updateGovernorate = (): void => {
    const region = this.loaded.regions.find(
      (item) => Number(item.regionId) === Number(this.elements.issueRegion.value)
    );
    this.elements.issueGovernorate.value = region ? region.governorate : "";
  };

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

    this.setCreateIssueStatus("");
    submitButton.disabled = true;
    form.setAttribute("aria-busy", "true");
    submitButton.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Submitting issue...';

    try {
      // The service reads the issue back so the new card matches every other
      // card. The lookups are passed in so it can resolve the same
      // client-side fields the dashboard load resolves.
      const created = await this.data.createIssue(
        payload,
        this.loaded.categories,
        this.loaded.regions
      );
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
            created.assignedDepartmentName ?? category?.departmentName ?? null
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

      this.renderDashboard();
      this.setCreateIssueStatus("");
      this.closeCreateModal();
      this.setPageStatus("The issue was added successfully.", "success");
    } catch (error) {
      this.setCreateIssueStatus(
        errorMessage(error, "The issue could not be created."),
        "danger"
      );
      this.elements.createIssueStatus.focus();
    } finally {
      form.removeAttribute("aria-busy");
      submitButton.disabled = false;
      submitButton.innerHTML =
        '<i class="bi bi-send-fill me-2" aria-hidden="true"></i>Submit Issue';
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
      this.elements.issueLatitude.value = detail.latitude.toFixed(6);
      this.elements.issueLongitude.value = detail.longitude.toFixed(6);
      this.elements.locationStatus.className = "location-capture__status is-success";
      this.elements.locationStatus.textContent =
        "Location pinned. Add a nearby street or landmark below before submitting.";
    });

    optionalById<HTMLElement>("createIssueModal")?.addEventListener("shown.bs.modal", () => {
      void mountMapsIn(document);
    });
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
        this.elements.issueLatitude.value = position.coords.latitude.toFixed(6);
        this.elements.issueLongitude.value = position.coords.longitude.toFixed(6);
        const mapContainer = optionalById<HTMLElement>("issueLocationMap");
        if (mapContainer) {
          setMapPin(mapContainer, position.coords.latitude, position.coords.longitude);
        }
        this.elements.locationStatus.className = "location-capture__status is-success";
        this.elements.locationStatus.textContent =
          "Coordinates captured. Add a nearby street or landmark before submitting.";
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
      const form = event.target.closest<HTMLFormElement>('form[data-action="add-comment"]');
      if (form) {
        event.preventDefault();
        void this.addComment(form);
      }
    });

    this.elements.detailHost.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
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
    this.elements.gallery.setAttribute("aria-busy", "true");
    this.elements.gallery.innerHTML = `
      <div class="ocsp-card p-4 text-center" role="status">
        <span class="spinner-border text-primary mx-auto mb-3" aria-hidden="true"></span>
        <span>Loading issues...</span>
      </div>`;

    try {
      this.dashboard = await this.data.getDashboardData();
      this.renderDashboard();
      await this.openLinkedIssueFromUrl();
    } catch (error) {
      const message = errorMessage(error, "The issue data could not be loaded.");
      this.elements.gallery.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <p>${escapeHtml(message)}</p>
          <button class="ocsp-button ocsp-button--submit" data-action="retry-issues" type="button">Try again</button>
        </div>`;
      this.elements.gallery.setAttribute("aria-busy", "false");
    }
  };

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

    this.bindFilterEvents();
    this.bindDelegatedEvents();
    this.bindFormEvents();
    this.initializeLocationCapture();
    this.initializeCreateMap();
    void this.loadDashboard();
  }
}
