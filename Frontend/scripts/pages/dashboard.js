(function initializeOcspDashboardPage(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const service = ocsp.dashboardService;
  const renderers = ocsp.dashboardRenderers;
  const shared = ocsp.issueRenderers;
  const shell = ocsp.siteSession;
  const session = ocsp.sessionService;
  const config = ocsp.config || {};

  const state = {
    dashboard: null,
    openIssueId: null,
    openIssueTrigger: null,
    filters: {
      search: "",
      sort: "newest",
      status: "",
      priority: "",
      department: "",
      category: ""
    },
    busy: {
      detail: false,
      status: false,
      comment: false,
      setup: false
    }
  };

  const statusRadioMap = Object.freeze({
    staffIssueFilterTotal: "",
    staffIssueFilterOpen: "Open",
    staffIssueFilterProgress: "InProgress",
    staffIssueFilterResolved: "Resolved"
  });

  const adminDialogTargets = Object.freeze([
    "adminManagement",
    "adminRegionPanel",
    "adminDepartmentPanel",
    "adminCategoryPanel"
  ]);

  let elements = {};
  let searchTimer = null;

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function byId(id) {
    return global.document.getElementById(id);
  }

  // Notification deep links are one-time navigation instructions. Removing
  // issueId after use prevents an old issue from reopening on refresh.
  function replaceHistoryWithoutIssueId(anchor) {
    const url = new URL(global.location.href);
    url.searchParams.delete("issueId");
    url.hash = anchor ? `#${anchor}` : "";
    global.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function cacheElements() {
    elements = {
      list: byId("issuesAccordion"),
      detailHost: byId("issueDetailModalHost"),
      resultSummary: byId("issuesResultSummary"),
      pageStatus: byId("dashboardPageStatus"),
      searchInput: byId("searchInput"),
      sortFilter: byId("sortFilter"),
      statusFilter: byId("statusFilter"),
      priorityFilter: byId("priorityFilter"),
      departmentFilter: byId("deptFilter"),
      categoryFilter: byId("categoryFilter"),
      activeFiltersPanel: byId("activeFiltersPanel"),
      activeFilterChips: byId("activeFilterChips"),
      filterCount: byId("dashboardFilterCount"),
      regionForm: byId("adminRegionForm"),
      departmentForm: byId("adminDepartmentForm"),
      categoryForm: byId("adminCategoryForm"),
      adminStatus: byId("adminManagementStatus"),
      adminRegionSelect: byId("adminDepartmentRegion"),
      adminDepartmentSelect: byId("adminCategoryDepartment")
    };
  }

  function setAlert(element, message, tone, extraClass) {
    if (!element) {
      return;
    }
    if (!message) {
      element.className = "d-none";
      element.textContent = "";
      return;
    }

    const safeTone = ["success", "danger", "info", "warning"].includes(tone)
      ? tone
      : "info";
    element.className = `alert alert-${safeTone} ${extraClass || ""}`.trim();
    element.textContent = message;
  }

  function setPageStatus(message, tone) {
    setAlert(elements.pageStatus, message, tone, "mb-4");
  }

  function setAdminStatus(message, tone) {
    setAlert(elements.adminStatus, message, tone, "mb-3");
  }

  // Role presentation changes copy and visibility without changing the V5 structure.
  function applyRolePresentation() {
    const user = state.dashboard.currentUser || {};
    const isAdmin = user.role === "Admin";
    const roleLabel = isAdmin ? "Admin" : "Staff";

    global.document.querySelectorAll("[data-admin-only]").forEach((element) => {
      element.hidden = !isAdmin;
    });
    [elements.regionForm, elements.departmentForm, elements.categoryForm].forEach((form) => {
      if (!form) {
        return;
      }
      const fieldset = form.querySelector("fieldset");
      const submitButton = form.querySelector('[type="submit"]');
      if (fieldset) fieldset.disabled = !isAdmin;
      if (submitButton) submitButton.disabled = !isAdmin;
    });

    const copy = {
      roleKicker: byId("dashboardRoleKicker"),
      heroCopy: byId("dashboardHeroCopy"),
      workspaceKicker: byId("dashboardWorkspaceKicker"),
      workspaceCopy: byId("dashboardWorkspaceCopy")
    };
    if (copy.roleKicker) copy.roleKicker.lastChild.textContent = ` ${roleLabel} dashboard`;
    if (copy.workspaceKicker) copy.workspaceKicker.lastChild.textContent = ` ${roleLabel} Workspace`;
    if (copy.heroCopy) {
      copy.heroCopy.textContent = isAdmin
        ? "Manage service structure, review civic issues and keep citizens informed from first assessment to resolution."
        : "Review civic issues, document municipal action and keep citizens informed from first assessment to resolution.";
    }
    if (copy.workspaceCopy) {
      copy.workspaceCopy.textContent = isAdmin
        ? "Manage platform setup, review civic issues, update their status, and respond to citizen comments."
        : "Review civic issues, update their status, and respond to citizen comments.";
    }

    if (!isAdmin && /^#admin(?:Management|Region|Department|Category)/.test(global.location.hash)) {
      global.history.replaceState(null, "", `${global.location.pathname}${global.location.search}#issuesAccordion`);
    }
  }

  function timeZoneDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: config.timeZone || "Asia/Muscat",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(date);
    } catch (_error) {
      return date.toISOString().slice(0, 10);
    }
  }

  function renderAccountAndHero() {
    const dashboard = state.dashboard;
    const issues = asArray(dashboard.issues);
    const user = dashboard.currentUser || {};
    const unreadCount = asArray(dashboard.notifications).filter(
      (notification) => !notification.isRead
    ).length;
    const openCount = issues.filter((issue) => issue.currentStatus === "Open").length;
    const progressCount = issues.filter((issue) => issue.currentStatus === "InProgress").length;
    const today = timeZoneDateKey(new Date());
    const resolvedToday = asArray(dashboard.statusUpdates).filter(
      (update) => update.newStatus === "Resolved" && timeZoneDateKey(update.updatedAt) === today
    ).length;

    const values = {
      dashboardUserAvatar: shared.getInitials(user.name),
      dashboardUserName: user.name || user.role || "Staff",
      dashboardHeroAssigned: `${issues.length} issue${issues.length === 1 ? "" : "s"}`,
      dashboardHeroResolvedToday: `${resolvedToday} resolved`
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = byId(id);
      if (element) element.textContent = value;
    });

    const workload = byId("dashboardHeroWorkloadCopy");
    if (workload) {
      if (!issues.length) {
        workload.textContent = "There are no issues waiting for action.";
      } else if (!openCount && !progressCount) {
        workload.textContent = "All issues are resolved.";
      } else {
        const parts = [];
        if (openCount) parts.push(`${openCount} open issue${openCount === 1 ? "" : "s"} need${openCount === 1 ? "s" : ""} triage`);
        if (progressCount) parts.push(`${progressCount} field task${progressCount === 1 ? " is" : "s are"} in progress`);
        workload.textContent = `${parts.join(" and ")}.`;
      }
    }

    const notificationCount = byId("dashboardNotificationCount");
    if (notificationCount) {
      notificationCount.textContent = String(unreadCount);
      notificationCount.hidden = unreadCount === 0;
      notificationCount.setAttribute(
        "aria-label",
        `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
      );
    }
  }

  function renderStatistics() {
    const issues = asArray(state.dashboard.issues);
    const counts = {
      Total: issues.length,
      Open: issues.filter((issue) => issue.currentStatus === "Open").length,
      Progress: issues.filter((issue) => issue.currentStatus === "InProgress").length,
      Resolved: issues.filter((issue) => issue.currentStatus === "Resolved").length
    };

    Object.entries(counts).forEach(([key, value]) => {
      const output = byId(`issueStat${key}`);
      if (output) output.textContent = String(value).padStart(2, "0");
    });
  }

  function replaceSelectOptions(select, placeholder, items, valueFor, labelFor) {
    if (!select) {
      return;
    }
    const previousValue = select.value;
    const fragment = global.document.createDocumentFragment();
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

  function renderLookupOptions() {
    const departments = asArray(state.dashboard.departments)
      .slice()
      .sort((left, right) => left.departmentName.localeCompare(right.departmentName));
    const categories = asArray(state.dashboard.categories)
      .slice()
      .sort((left, right) => left.categoryName.localeCompare(right.categoryName));
    const regions = asArray(state.dashboard.regions)
      .slice()
      .sort((left, right) => left.regionName.localeCompare(right.regionName));

    replaceSelectOptions(
      elements.departmentFilter,
      "All Departments",
      departments,
      (department) => department.departmentName,
      (department) => department.departmentName
    );
    replaceSelectOptions(
      elements.categoryFilter,
      "All Categories",
      categories,
      (category) => category.categoryName,
      (category) => category.categoryName
    );
    replaceSelectOptions(
      elements.adminRegionSelect,
      "Select a region",
      regions,
      (region) => region.regionId,
      (region) => `${region.regionName} — ${region.governorate}`
    );
    replaceSelectOptions(
      elements.adminDepartmentSelect,
      "Select a department",
      departments,
      (department) => department.departmentId,
      (department) => department.departmentName
    );
  }

  function normalizedSearch(value) {
    return String(value || "").trim().toLocaleLowerCase();
  }

  function getVisibleIssues() {
    const search = normalizedSearch(state.filters.search);
    const visible = asArray(state.dashboard.issues).filter((issue) => {
      const searchable = normalizedSearch([
        issue.title,
        issue.description,
        issue.location,
        issue.categoryName,
        issue.assignedDepartmentName,
        issue.regionName,
        issue.issueId,
        issue.reportedById
      ].join(" "));

      return (
        (!search || searchable.includes(search)) &&
        (!state.filters.status || issue.currentStatus === state.filters.status) &&
        (!state.filters.priority || issue.priority === state.filters.priority) &&
        (!state.filters.department || issue.assignedDepartmentName === state.filters.department) &&
        (!state.filters.category || issue.categoryName === state.filters.category)
      );
    });

    const direction = state.filters.sort === "oldest" ? 1 : -1;
    return visible.sort((left, right) => {
      const leftTime = new Date(left.reportedDate).getTime() || 0;
      const rightTime = new Date(right.reportedDate).getTime() || 0;
      return (leftTime - rightTime) * direction;
    });
  }

  function renderIssues() {
    const issues = asArray(state.dashboard.issues);
    const visible = getVisibleIssues();
    elements.list.setAttribute("aria-busy", "true");

    if (!issues.length) {
      elements.list.innerHTML = `
        <div class="ocsp-card p-4 text-center" role="status">
          <i class="bi bi-inboxes fs-2 text-primary" aria-hidden="true"></i>
          <h3 class="h5 mt-3">No issues</h3>
          <p class="text-muted mb-0">New civic reports will appear here when they are available.</p>
        </div>`;
    } else if (!visible.length) {
      elements.list.innerHTML = `
        <div class="ocsp-card p-4 text-center" role="status">
          <i class="bi bi-search fs-2 text-primary" aria-hidden="true"></i>
          <h3 class="h5 mt-3">No matching issues</h3>
          <p class="text-muted mb-3">Try changing your search or filters.</p>
          <button class="btn ocsp-button ocsp-button--cancel" type="button" data-action="clear-filters">Clear filters</button>
        </div>`;
    } else {
      elements.list.innerHTML = visible.map(renderers.renderStaffIssueCard).join("");
    }

    if (elements.resultSummary) {
      elements.resultSummary.textContent = issues.length
        ? `Showing ${visible.length} of ${issues.length} issue${issues.length === 1 ? "" : "s"}.`
        : "No issues are available.";
    }
    elements.list.setAttribute("aria-busy", "false");
  }

  function activeFilterDefinitions() {
    const definitions = [];
    if (state.filters.search.trim()) {
      definitions.push({ key: "search", label: "Search", value: state.filters.search.trim() });
    }
    if (state.filters.status) {
      definitions.push({
        key: "status",
        label: "Status",
        value: shared.getStatusMeta(state.filters.status).label
      });
    }
    if (state.filters.priority) {
      definitions.push({ key: "priority", label: "Priority", value: state.filters.priority });
    }
    if (state.filters.department) {
      definitions.push({ key: "department", label: "Dept", value: state.filters.department });
    }
    if (state.filters.category) {
      definitions.push({ key: "category", label: "Category", value: state.filters.category });
    }
    if (state.filters.sort !== "newest") {
      definitions.push({ key: "sort", label: "Sort", value: "Oldest First" });
    }
    return definitions;
  }

  function renderActiveFilters() {
    const filters = activeFilterDefinitions();
    if (elements.filterCount) {
      elements.filterCount.textContent = String(filters.length);
      elements.filterCount.hidden = filters.length === 0;
    }
    if (elements.activeFiltersPanel) {
      elements.activeFiltersPanel.hidden = filters.length === 0;
    }
    elements.activeFilterChips.innerHTML = filters.map((filter) => `
      <span class="badge bg-white text-dark border shadow-sm rounded-pill d-inline-flex align-items-center gap-2 px-3 py-2 fw-semibold fs-6">
        <span class="text-muted fw-normal">${shared.escapeHtml(filter.label)}:</span>
        ${shared.escapeHtml(filter.value)}
        <button class="btn-close ms-1 active-filter__dismiss" type="button" data-action="remove-filter" data-filter="${shared.escapeHtml(filter.key)}" aria-label="Remove ${shared.escapeHtml(filter.label)} filter"></button>
      </span>`).join("");
  }

  function syncFilterControls() {
    if (elements.searchInput.value !== state.filters.search) {
      elements.searchInput.value = state.filters.search;
    }
    elements.sortFilter.value = state.filters.sort;
    elements.statusFilter.value = state.filters.status;
    elements.priorityFilter.value = state.filters.priority;
    elements.departmentFilter.value = state.filters.department;
    elements.categoryFilter.value = state.filters.category;

    Object.entries(statusRadioMap).forEach(([id, status]) => {
      const radio = byId(id);
      if (radio) radio.checked = status === state.filters.status;
    });
  }

  function renderFilteredContent() {
    syncFilterControls();
    renderIssues();
    renderActiveFilters();
  }

  function renderDashboard() {
    applyRolePresentation();
    renderAccountAndHero();
    renderStatistics();
    renderLookupOptions();
    renderFilteredContent();
  }

  function clearFilters(focusSearch) {
    global.clearTimeout(searchTimer);
    searchTimer = null;
    state.filters = {
      search: "",
      sort: "newest",
      status: "",
      priority: "",
      department: "",
      category: ""
    };
    renderFilteredContent();
    if (focusSearch) {
      global.requestAnimationFrame(() => elements.searchInput.focus());
    }
  }

  function removeFilter(key) {
    if (!(key in state.filters)) {
      return;
    }
    state.filters[key] = key === "sort" ? "newest" : "";
    renderFilteredContent();
  }

  function closeFilterDrawer() {
    global.location.hash = "dashboardFilterTrigger";
  }

  function applyDrawerFilters() {
    state.filters.sort = elements.sortFilter.value;
    state.filters.status = elements.statusFilter.value;
    state.filters.priority = elements.priorityFilter.value;
    state.filters.department = elements.departmentFilter.value;
    state.filters.category = elements.categoryFilter.value;
    renderFilteredContent();
    closeFilterDrawer();
    byId("dashboardFilterTrigger").focus();
  }

  // Details are fetched only when opened, preventing one request per list card.
  async function showIssueDetails(issueId, trigger) {
    const numericIssueId = Number(issueId);
    if (state.busy.detail || !Number.isInteger(numericIssueId) || numericIssueId < 1) {
      return;
    }

    const requestHash = global.location.hash;
    state.busy.detail = true;
    state.openIssueTrigger = trigger || global.document.activeElement;
    if (trigger) trigger.setAttribute("aria-busy", "true");
    setPageStatus("", "info");

    try {
      const issue = await service.getStaffIssueDetails(numericIssueId);

      // A navigation during the lazy request makes its result stale. Ignoring
      // it prevents Back or another dialog from being overridden on arrival.
      if (global.location.hash !== requestHash) {
        state.openIssueTrigger = null;
        return;
      }
      state.openIssueId = numericIssueId;
      elements.detailHost.innerHTML = renderers.renderStaffIssueDetailModal(issue);
      const modalAnchor = `issueModal-${shared.safeDomId(numericIssueId)}`;
      const isDeepLink = new URLSearchParams(global.location.search).has("issueId");

      // Consume notification deep links in one history update. Ordinary card
      // opens still create a Back-button entry for the issue dialog.
      if (isDeepLink) {
        replaceHistoryWithoutIssueId(modalAnchor);
      } else {
        global.location.hash = modalAnchor;
      }
      global.requestAnimationFrame(() => {
        const modal = byId(`issueModal-${shared.safeDomId(numericIssueId)}`);
        if (modal) modal.focus();
      });
    } catch (error) {
      state.openIssueId = null;
      state.openIssueTrigger = null;
      elements.detailHost.replaceChildren();
      setPageStatus(error.message || "The issue details could not be loaded.", "danger");
    } finally {
      state.busy.detail = false;
      if (trigger) trigger.removeAttribute("aria-busy");
    }
  }

  function closeIssueDetails(restoreFocus, updateUrl) {
    const trigger = state.openIssueTrigger;
    const targetId = trigger && trigger.id ? trigger.id : "issuesAccordion";
    state.openIssueId = null;
    state.openIssueTrigger = null;

    // Explicit closes consume the modal URL. Browser Back already selected the
    // destination entry, so its hash-driven close must leave that URL intact.
    if (updateUrl !== false) {
      replaceHistoryWithoutIssueId(targetId);
    }
    elements.detailHost.replaceChildren();
    if (restoreFocus !== false && trigger && trigger.isConnected) {
      trigger.focus();
    }
  }

  async function changeStatus(form) {
    if (state.busy.status || !form.reportValidity()) {
      return;
    }

    const issueId = Number(form.dataset.issueId);
    const formData = new FormData(form);
    const payload = {
      newStatus: String(formData.get("newStatus") || ""),
      notes: String(formData.get("notes") || "").trim() || null
    };
    const submitButton = form.querySelector('[type="submit"]');
    const status = form.querySelector("[data-status-action-status]");

    state.busy.status = true;
    form.setAttribute("aria-busy", "true");
    submitButton.disabled = true;
    status.textContent = "Updating status...";

    try {
      const response = await service.changeIssueStatus(issueId, payload);
      const update = response && typeof response === "object"
        ? {
            ...response,
            issueId: Number(response.issueId || issueId),
            newStatus: response.newStatus || payload.newStatus,
            notes: response.notes === undefined ? payload.notes : response.notes,
            updatedAt: response.updatedAt || new Date().toISOString()
          }
        : {
            issueId,
            newStatus: payload.newStatus,
            notes: payload.notes,
            updatedAt: new Date().toISOString()
          };
      const issue = asArray(state.dashboard.issues).find(
        (item) => Number(item.issueId) === issueId
      );
      if (issue) issue.currentStatus = update.newStatus;

      // The write has succeeded, so update the local view without a second
      // request that could make a saved change look like a failed change.
      const updateId = Number(update.statusUpdateId);
      state.dashboard.statusUpdates = [
        update,
        ...asArray(state.dashboard.statusUpdates).filter(
          (item) => !updateId || Number(item.statusUpdateId) !== updateId
        )
      ];
      state.openIssueId = null;
      state.openIssueTrigger = null;
      elements.detailHost.replaceChildren();
      replaceHistoryWithoutIssueId("issuesAccordion");
      renderAccountAndHero();
      renderStatistics();
      renderFilteredContent();
      setPageStatus("The issue status was updated successfully.", "success");
      const newTrigger = elements.list.querySelector(
        `[data-action="open-issue"][data-issue-id="${shared.safeDomId(issueId)}"]`
      );
      if (newTrigger) {
        newTrigger.focus();
      } else {
        elements.pageStatus.focus();
      }
    } catch (error) {
      status.textContent = error.message || "The issue status could not be updated.";
    } finally {
      state.busy.status = false;
      form.removeAttribute("aria-busy");
      submitButton.disabled = false;
    }
  }

  async function addStaffComment(form) {
    if (state.busy.comment || !form.reportValidity()) {
      return;
    }

    const issueId = Number(form.dataset.issueId);
    const input = form.querySelector("[data-comment-input]");
    const submitButton = form.querySelector('[type="submit"]');
    const status = form.parentElement.querySelector("[data-comment-status]");
    const content = input.value.trim();
    if (!content) {
      input.focus();
      return;
    }

    state.busy.comment = true;
    form.setAttribute("aria-busy", "true");
    input.disabled = true;
    submitButton.disabled = true;
    status.textContent = "Adding comment...";

    try {
      const response = await service.addStaffComment(issueId, content);
      const currentUser = state.dashboard.currentUser || {};
      const comment = {
        issueId,
        userId: currentUser.userId,
        userName: currentUser.name || "Staff",
        content,
        isStaffComment: true,
        commentDate: new Date().toISOString(),
        ...(response && typeof response === "object" ? response : {})
      };
      const thread = form.parentElement.querySelector("[data-comment-thread]");
      thread.querySelector("[data-empty-comments]")?.remove();
      thread.insertAdjacentHTML("beforeend", shared.renderComments([comment]));
      input.value = "";
      status.textContent = "Comment added.";
    } catch (error) {
      status.textContent = error.message || "The comment could not be added.";
    } finally {
      state.busy.comment = false;
      form.removeAttribute("aria-busy");
      input.disabled = false;
      submitButton.disabled = false;
      input.focus();
    }
  }

  function adminPayload(form) {
    const data = new FormData(form);
    if (form === elements.regionForm) {
      return {
        method: "createRegion",
        label: "Region",
        payload: {
          regionName: String(data.get("regionName") || "").trim(),
          governorate: String(data.get("governorate") || "")
        }
      };
    }
    if (form === elements.departmentForm) {
      return {
        method: "createDepartment",
        label: "Department",
        payload: {
          departmentName: String(data.get("departmentName") || "").trim(),
          contactEmail: String(data.get("contactEmail") || "").trim(),
          description: String(data.get("description") || "").trim() || null,
          regionId: data.get("regionId")
            ? Number(data.get("regionId"))
            : null
        }
      };
    }
    return {
      method: "createCategory",
      label: "Category",
      payload: {
        categoryName: String(data.get("categoryName") || "").trim(),
        description: String(data.get("description") || "").trim() || null,
        departmentId: Number(data.get("departmentId"))
      }
    };
  }

  async function submitAdminForm(form) {
    const currentUser = state.dashboard.currentUser || {};
    if (currentUser.role !== "Admin") {
      setAdminStatus("Only an Admin can change platform setup.", "danger");
      return;
    }
    if (state.busy.setup || !form.reportValidity()) {
      return;
    }

    const request = adminPayload(form);
    const submitButton = form.querySelector('[type="submit"]');
    state.busy.setup = true;
    form.setAttribute("aria-busy", "true");
    submitButton.disabled = true;
    setAdminStatus(`Adding ${request.label.toLocaleLowerCase()}...`, "info");

    try {
      const created = await service[request.method](request.payload);
      const collection = {
        createRegion: "regions",
        createDepartment: "departments",
        createCategory: "categories"
      }[request.method];

      // Creation has already succeeded; update lookup state from the returned
      // DTO and never turn a later refresh problem into a duplicate POST.
      if (collection && created && typeof created === "object") {
        state.dashboard[collection] = [
          ...asArray(state.dashboard[collection]),
          created
        ];
      }
      form.reset();
      renderLookupOptions();
      setAdminStatus(`${request.label} added successfully.`, "success");
    } catch (error) {
      setAdminStatus(error.message || `The ${request.label.toLocaleLowerCase()} could not be added.`, "danger");
      elements.adminStatus.focus();
    } finally {
      state.busy.setup = false;
      form.removeAttribute("aria-busy");
      submitButton.disabled = false;
    }
  }

  function bindFilterEvents() {
    elements.searchInput.addEventListener("input", (event) => {
      global.clearTimeout(searchTimer);
      searchTimer = global.setTimeout(() => {
        state.filters.search = event.target.value;
        renderFilteredContent();
      }, 150);
    });

    Object.entries(statusRadioMap).forEach(([id, status]) => {
      byId(id).addEventListener("change", (event) => {
        if (event.target.checked) {
          state.filters.status = status;
          renderFilteredContent();
        }
      });
    });

    byId("resetFiltersButton").addEventListener("click", () => clearFilters(false));
    byId("clearAllFiltersButton").addEventListener("click", () => clearFilters(true));
    byId("applyFiltersButton").addEventListener("click", applyDrawerFilters);
  }

  function focusableDialogElements(dialog) {
    const selector = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(", ");

    return [...dialog.querySelectorAll(selector)].filter(
      (element) => !element.hidden && element.getClientRects().length > 0
    );
  }

  // One focus trap serves the data-rendered issue dialog and the two V5
  // CSS-target dialogs, keeping keyboard behavior consistent everywhere.
  function trapDialogFocus(event, dialog) {
    if (!dialog) return;

    const focusable = focusableDialogElements(dialog);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = global.document.activeElement;
    const activeIsBoundary = active === dialog || !focusable.includes(active);
    if (event.shiftKey && (active === first || activeIsBoundary)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || activeIsBoundary)) {
      event.preventDefault();
      first.focus();
    }
  }

  function currentCssDialog() {
    const targetId = global.location.hash.replace(/^#/, "");
    if (targetId === "filterDrawer") {
      const dialog = byId("filterDrawer");
      return dialog
        ? {
            dialog,
            focusTarget: dialog,
            trigger: byId("dashboardFilterTrigger")
          }
        : null;
    }

    if (!adminDialogTargets.includes(targetId)) {
      return null;
    }

    const dialog = byId("adminManagement");
    if (!dialog || dialog.hidden) {
      return null;
    }

    return {
      dialog,
      focusTarget: byId(targetId) || dialog,
      trigger: byId("adminManagementTrigger")
    };
  }

  function focusCssDialog(context) {
    global.requestAnimationFrame(() => {
      const target = context && (context.focusTarget || context.dialog);
      if (target) target.focus();
    });
  }

  function closeCssDialog(context) {
    if (!context || !context.trigger) {
      return;
    }
    replaceHistoryWithoutIssueId(context.trigger.id);
    global.requestAnimationFrame(() => context.trigger.focus());
  }

  function bindDelegatedEvents() {
    elements.list.addEventListener("click", (event) => {
      const openTrigger = event.target.closest('[data-action="open-issue"]');
      const clearTrigger = event.target.closest('[data-action="clear-filters"]');
      const retryTrigger = event.target.closest('[data-action="retry-dashboard"]');
      if (openTrigger) {
        event.preventDefault();
        showIssueDetails(openTrigger.dataset.issueId, openTrigger);
      } else if (clearTrigger) {
        clearFilters(true);
      } else if (retryTrigger) {
        loadDashboard();
      }
    });

    elements.activeFilterChips.addEventListener("click", (event) => {
      const trigger = event.target.closest('[data-action="remove-filter"]');
      if (trigger) removeFilter(trigger.dataset.filter);
    });

    elements.detailHost.addEventListener("click", (event) => {
      const closeTrigger = event.target.closest('[data-action="close-issue"]');
      if (closeTrigger) {
        event.preventDefault();
        closeIssueDetails(true);
      }
    });

    elements.detailHost.addEventListener("submit", (event) => {
      const statusForm = event.target.closest('form[data-action="change-status"]');
      const commentForm = event.target.closest('form[data-action="add-staff-comment"]');
      if (statusForm) {
        event.preventDefault();
        changeStatus(statusForm);
      } else if (commentForm) {
        event.preventDefault();
        addStaffComment(commentForm);
      }
    });

    global.document.addEventListener("keydown", (event) => {
      const issueDialog = state.openIssueId
        ? byId(`issueModal-${shared.safeDomId(state.openIssueId)}`)
        : null;
      if (issueDialog) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeIssueDetails(true);
        } else if (event.key === "Tab") {
          trapDialogFocus(event, issueDialog);
        }
        return;
      }

      const dialogContext = currentCssDialog();
      if (!dialogContext) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeCssDialog(dialogContext);
      } else if (event.key === "Tab") {
        trapDialogFocus(event, dialogContext.dialog);
      }
    });

    global.addEventListener("hashchange", () => {
      let closedIssueFromHistory = false;
      if (
        state.openIssueId &&
        global.location.hash !== `#issueModal-${shared.safeDomId(state.openIssueId)}`
      ) {
        closeIssueDetails(true, false);
        closedIssueFromHistory = true;
      }

      // A Forward navigation back to an issue hash restores its lazy dialog.
      if (!state.openIssueId && issueIdFromHash()) {
        openIssueFromHash();
        return;
      }

      const dialogContext = currentCssDialog();
      if (dialogContext) {
        focusCssDialog(dialogContext);
        return;
      }

      const restoredTrigger = !closedIssueFromHistory && {
        "#adminManagementTrigger": byId("adminManagementTrigger"),
        "#dashboardFilterTrigger": byId("dashboardFilterTrigger")
      }[global.location.hash];
      if (restoredTrigger) {
        global.requestAnimationFrame(() => restoredTrigger.focus());
      }
    });
  }

  function bindAdminEvents() {
    [elements.regionForm, elements.departmentForm, elements.categoryForm].forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submitAdminForm(form);
      });
    });
  }

  function issueIdFromHash() {
    const match = /^#issueModal-(\d+)$/.exec(global.location.hash);
    return match ? Number(match[1]) : null;
  }

  async function openIssueFromHash() {
    const issueId = issueIdFromHash();
    if (!issueId || state.openIssueId || state.busy.detail || !state.dashboard) {
      return;
    }

    const exists = asArray(state.dashboard.issues).some(
      (issue) => Number(issue.issueId) === issueId
    );
    if (!exists) {
      setPageStatus("The linked issue could not be found.", "warning");
      replaceHistoryWithoutIssueId("issuesAccordion");
      return;
    }

    const trigger = elements.list.querySelector(
      `[data-action="open-issue"][data-issue-id="${shared.safeDomId(issueId)}"]`
    );
    await showIssueDetails(issueId, trigger);
  }

  async function openLinkedIssueFromUrl() {
    const rawIssueId = new URLSearchParams(global.location.search).get("issueId");
    if (!rawIssueId) {
      return;
    }

    const issueId = Number(rawIssueId);
    const exists = Number.isInteger(issueId) && issueId > 0
      && asArray(state.dashboard.issues).some((issue) => Number(issue.issueId) === issueId);
    if (!exists) {
      setPageStatus("The linked issue could not be found.", "warning");
      replaceHistoryWithoutIssueId("issuesAccordion");
      return;
    }

    const trigger = elements.list.querySelector(
      `[data-action="open-issue"][data-issue-id="${shared.safeDomId(issueId)}"]`
    );
    await showIssueDetails(issueId, trigger);
  }

  async function loadDashboard() {
    elements.list.setAttribute("aria-busy", "true");
    elements.list.innerHTML = `
      <div class="ocsp-card p-4 text-center" role="status">
        <span class="spinner-border text-primary mx-auto mb-3" aria-hidden="true"></span>
        <span class="d-block">Loading issues...</span>
      </div>`;

    try {
      state.dashboard = await service.getStaffDashboardData();
      renderDashboard();
      const flash = session && session.consumeFlash();
      await openLinkedIssueFromUrl();
      if (!state.openIssueId) {
        await openIssueFromHash();
      }
      const warnings = asArray(state.dashboard.warnings);
      if (flash && flash.message) {
        setPageStatus(flash.message, flash.tone);
      } else if (warnings.length && elements.pageStatus.classList.contains("d-none")) {
        setPageStatus(
          `Some supporting dashboard data could not be loaded: ${warnings.join(", ")}.`,
          "warning"
        );
      }
    } catch (error) {
      elements.list.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <p class="mb-3">${shared.escapeHtml(error.message || "The dashboard could not be loaded.")}</p>
          <button class="btn ocsp-button ocsp-button--submit" type="button" data-action="retry-dashboard">Try again</button>
        </div>`;
      elements.list.setAttribute("aria-busy", "false");
    }
  }

  async function start() {
    if (shell && !shell.isPageAllowed()) {
      return;
    }

    cacheElements();
    if (!service || !renderers || !shared || !elements.list || !elements.detailHost) {
      throw new Error("The Dashboard frontend modules were not loaded in the expected order.");
    }

    bindFilterEvents();
    bindDelegatedEvents();
    bindAdminEvents();

    // The filter drawer is visible from its initial :target before data loads,
    // so move focus immediately instead of waiting on network requests.
    const initialDialogContext = currentCssDialog();
    if (initialDialogContext) {
      focusCssDialog(initialDialogContext);
    }

    await loadDashboard();

    // Admin setup becomes focusable only after role rendering removes hidden.
    const revealedDialogContext = currentCssDialog();
    if (
      revealedDialogContext &&
      (!initialDialogContext || revealedDialogContext.dialog !== initialDialogContext.dialog)
    ) {
      focusCssDialog(revealedDialogContext);
    }
  }

  global.document.addEventListener("DOMContentLoaded", () => {
    start().catch((error) => {
      const status = byId("dashboardPageStatus");
      if (status) {
        status.className = "alert alert-danger mb-4";
        status.textContent = error.message || "The dashboard could not start.";
      }
    });
  });
})(window);
