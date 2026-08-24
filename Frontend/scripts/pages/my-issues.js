(function initializeMyIssuesPage(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const service = ocsp.dataService;
  const renderers = ocsp.issueRenderers;
  const shell = ocsp.siteSession;

  const state = {
    dashboard: null,
    openIssueId: null,
    openIssueTrigger: null,
    filters: {
      search: "",
      status: "",
      priority: "",
      department: "",
      category: "",
      sort: "newest"
    }
  };

  const statusRadioMap = Object.freeze({
    citizenIssueFilterTotal: "",
    citizenIssueFilterOpen: "Open",
    citizenIssueFilterProgress: "InProgress",
    citizenIssueFilterResolved: "Resolved"
  });

  let elements = {};
  let searchTimer = null;

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function byId(id) {
    return global.document.getElementById(id);
  }

  function cacheElements() {
    elements = {
      gallery: byId("citizenIssuesGallery"),
      detailHost: byId("issueDetailModalHost"),
      resultSummary: byId("issuesResultSummary"),
      searchInput: byId("searchInput"),
      sortFilter: byId("sortFilter"),
      statusFilter: byId("statusFilter"),
      priorityFilter: byId("priorityFilter"),
      departmentFilter: byId("deptFilter"),
      categoryFilter: byId("categoryFilter"),
      activeFiltersPanel: byId("activeFiltersPanel"),
      activeFilterChips: byId("activeFilterChips"),
      activeFilterCount: byId("activeFilterCount"),
      createIssueForm: byId("createIssueForm"),
      createIssueStatus: byId("createIssueStatus"),
      issueCategory: byId("issueCategory"),
      issueRegion: byId("issueRegion"),
      issueGovernorate: byId("issueGovernorate"),
      issueLatitude: byId("issueLatitude"),
      issueLongitude: byId("issueLongitude"),
      locationButton: byId("useCurrentLocation"),
      locationStatus: byId("locationStatus"),
      pageStatus: byId("pageStatus")
    };
  }

  function setPageStatus(message, tone) {
    if (!elements.pageStatus) {
      return;
    }

    if (!message) {
      elements.pageStatus.className = "d-none";
      elements.pageStatus.textContent = "";
      return;
    }

    const alertTone = ["success", "danger", "info", "warning"].includes(tone)
      ? tone
      : "info";
    elements.pageStatus.className = `alert alert-${alertTone} mb-4`;
    elements.pageStatus.textContent = message;
  }

  function setCreateIssueStatus(message, tone) {
    if (!elements.createIssueStatus) {
      return;
    }

    if (!message) {
      elements.createIssueStatus.className = "alert d-none";
      elements.createIssueStatus.textContent = "";
      return;
    }

    const safeTone = ["success", "danger", "info", "warning"].includes(tone)
      ? tone
      : "info";
    elements.createIssueStatus.className = `alert alert-${safeTone} mb-3`;
    elements.createIssueStatus.textContent = message;
  }

  function firstName(name) {
    return String(name || "Citizen").trim().split(/\s+/)[0] || "Citizen";
  }

  function renderAccountSummary() {
    const dashboard = state.dashboard;
    const issues = asArray(dashboard.issues);
    const user = dashboard.currentUser || {};
    const unreadCount = asArray(dashboard.notifications).filter(
      (notification) => !notification.isRead
    ).length;
    const resolvedCount = issues.filter(
      (issue) => issue.currentStatus === "Resolved"
    ).length;
    const activeCount = issues.length - resolvedCount;

    const userName = byId("currentUserName");
    const userAvatar = byId("currentUserAvatar");
    const notificationCount = byId("notificationCount");
    const heroTotal = byId("heroIssueTotal");
    const heroSummary = byId("heroIssueSummary");
    const heroResolved = byId("heroResolvedCount");

    if (userName) {
      userName.textContent = firstName(user.name);
    }
    if (userAvatar) {
      userAvatar.textContent = renderers.getInitials(user.name);
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
      heroSummary.textContent = issues.length === 0
        ? "Your submitted reports will appear here."
        : activeCount
          ? `${activeCount} report${activeCount === 1 ? " is" : "s are"} awaiting or receiving municipal action.`
          : "All of your reports have been resolved.";
    }
    if (heroResolved) {
      heroResolved.textContent = `${resolvedCount} resolved`;
    }
  }

  function renderStatistics() {
    const issues = asArray(state.dashboard.issues);
    const counts = {
      total: issues.length,
      open: issues.filter((issue) => issue.currentStatus === "Open").length,
      progress: issues.filter((issue) => issue.currentStatus === "InProgress").length,
      resolved: issues.filter((issue) => issue.currentStatus === "Resolved").length
    };

    Object.entries(counts).forEach(([key, value]) => {
      const output = byId(`issueStat${key[0].toUpperCase()}${key.slice(1)}`);
      if (output) {
        output.textContent = String(value).padStart(2, "0");
      }
    });
  }

  function replaceSelectOptions(select, placeholder, items, getValue, getLabel) {
    if (!select) {
      return;
    }

    const selectedValue = select.value;
    const fragment = global.document.createDocumentFragment();
    fragment.append(new Option(placeholder, ""));

    items.forEach((item) => {
      fragment.append(new Option(getLabel(item), String(getValue(item))));
    });

    select.replaceChildren(fragment);
    if ([...select.options].some((option) => option.value === selectedValue)) {
      select.value = selectedValue;
    }
  }

  function renderLookupOptions() {
    const dashboard = state.dashboard;
    const categories = asArray(dashboard.categories);
    const regions = asArray(dashboard.regions);
    const departments = [
      ...new Set(
        asArray(dashboard.issues)
          .map((issue) => issue.assignedDepartmentName)
          .filter(Boolean)
      )
    ].sort((left, right) => left.localeCompare(right));

    replaceSelectOptions(
      elements.categoryFilter,
      "All Categories",
      categories,
      (category) => category.categoryName,
      (category) => category.categoryName
    );
    replaceSelectOptions(
      elements.departmentFilter,
      "All Departments",
      departments,
      (department) => department,
      (department) => department
    );
    replaceSelectOptions(
      elements.issueCategory,
      "Select a category",
      categories,
      (category) => category.categoryId,
      (category) => category.categoryName
    );
    replaceSelectOptions(
      elements.issueRegion,
      "Select region",
      regions,
      (region) => region.regionId,
      (region) => `${region.regionName} — ${region.governorate}`
    );
  }

  function normalizedSearchText(value) {
    return String(value || "").trim().toLocaleLowerCase();
  }

  function getVisibleIssues() {
    const filters = state.filters;
    const search = normalizedSearchText(filters.search);
    const issues = asArray(state.dashboard.issues).filter((issue) => {
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

  function renderIssues() {
    elements.gallery.setAttribute("aria-busy", "true");
    const visibleIssues = getVisibleIssues();
    const totalIssues = asArray(state.dashboard.issues).length;

    if (totalIssues === 0) {
      elements.gallery.innerHTML = `
        <div class="ocsp-card p-4 text-center" role="status">
          <i class="bi bi-clipboard-plus fs-2 text-primary mb-2" aria-hidden="true"></i>
          <h3 class="h5">No issues submitted yet</h3>
          <p class="text-muted mb-3">Create your first report to start tracking community service work.</p>
          <button class="ocsp-button ocsp-button--submit align-self-center" data-bs-toggle="modal" data-bs-target="#createIssueModal" type="button">Report an issue</button>
        </div>`;
    } else if (!visibleIssues.length) {
      elements.gallery.innerHTML = `
        <div class="ocsp-card p-4 text-center" role="status">
          <i class="bi bi-search fs-2 text-primary mb-2" aria-hidden="true"></i>
          <h3 class="h5">No matching issues</h3>
          <p class="text-muted mb-3">Try changing your search or filters.</p>
          <button class="ocsp-button ocsp-button--cancel align-self-center" data-action="clear-filters" type="button">Clear filters</button>
        </div>`;
    } else {
      elements.gallery.innerHTML = `
        <div class="issues-list">
          ${visibleIssues.map(renderers.renderIssueCard).join("")}
        </div>`;
    }

    if (elements.resultSummary) {
      elements.resultSummary.textContent = totalIssues === 0
        ? "No issues submitted yet."
        : `Showing ${visibleIssues.length} of ${totalIssues} issue${totalIssues === 1 ? "" : "s"}.`;
    }
    elements.gallery.setAttribute("aria-busy", "false");
  }

  function getActiveFilterDefinitions() {
    const filters = state.filters;
    const definitions = [];
    const status = filters.status ? renderers.getStatusMeta(filters.status).label : "";

    if (filters.search.trim()) {
      definitions.push({ key: "search", label: "Search", value: filters.search.trim() });
    }
    if (filters.status) {
      definitions.push({ key: "status", label: "Status", value: status });
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

  function renderActiveFilters() {
    const filters = getActiveFilterDefinitions();
    const escapeHtml = renderers.escapeHtml;

    if (elements.activeFilterCount) {
      elements.activeFilterCount.textContent = String(filters.length);
      elements.activeFilterCount.hidden = filters.length === 0;
    }
    if (elements.activeFiltersPanel) {
      elements.activeFiltersPanel.hidden = filters.length === 0;
    }
    if (!elements.activeFilterChips) {
      return;
    }

    elements.activeFilterChips.innerHTML = filters
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

  function syncFilterControls() {
    const filters = state.filters;
    if (elements.searchInput && elements.searchInput.value !== filters.search) {
      elements.searchInput.value = filters.search;
    }
    if (elements.sortFilter) elements.sortFilter.value = filters.sort;
    if (elements.statusFilter) elements.statusFilter.value = filters.status;
    if (elements.priorityFilter) elements.priorityFilter.value = filters.priority;
    if (elements.departmentFilter) elements.departmentFilter.value = filters.department;
    if (elements.categoryFilter) elements.categoryFilter.value = filters.category;

    Object.entries(statusRadioMap).forEach(([id, status]) => {
      const radio = byId(id);
      if (radio) {
        radio.checked = status === filters.status;
      }
    });
  }

  function renderFilteredContent() {
    syncFilterControls();
    renderIssues();
    renderActiveFilters();
  }

  function renderDashboard() {
    renderAccountSummary();
    renderStatistics();
    renderLookupOptions();
    renderFilteredContent();
  }

  function clearFilters() {
    state.filters = {
      search: "",
      status: "",
      priority: "",
      department: "",
      category: "",
      sort: "newest"
    };
    renderFilteredContent();
  }

  function removeFilter(key) {
    if (!(key in state.filters)) {
      return;
    }
    state.filters[key] = key === "sort" ? "newest" : "";
    renderFilteredContent();
  }

  async function showIssueDetails(issueId, trigger) {
    setPageStatus("", "info");
    state.openIssueTrigger = trigger || global.document.activeElement;

    try {
      const issue = await service.getIssueDetails(issueId);
      state.openIssueId = Number(issueId);
      elements.detailHost.innerHTML = renderers.renderIssueDetailModal(issue);
      const modalElement = byId(`citizenIssueDetails-${renderers.safeDomId(issueId)}`);

      modalElement.addEventListener("hidden.bs.modal", () => {
        const returnFocus = state.openIssueTrigger;
        state.openIssueId = null;
        state.openIssueTrigger = null;
        elements.detailHost.replaceChildren();
        if (returnFocus && returnFocus.isConnected) {
          returnFocus.focus();
        }
      }, { once: true });

      if (global.bootstrap && global.bootstrap.Modal) {
        global.bootstrap.Modal.getOrCreateInstance(modalElement).show();
      } else {
        throw new Error("Bootstrap JavaScript could not be loaded, so the details dialog is unavailable.");
      }
    } catch (error) {
      state.openIssueId = null;
      state.openIssueTrigger = null;
      elements.detailHost.replaceChildren();
      setPageStatus(error.message || "The issue details could not be loaded.", "danger");
    }
  }

  async function addComment(form) {
    const issueId = Number(form.dataset.issueId);
    const input = form.querySelector("[data-comment-input]");
    const submitButton = form.querySelector('[type="submit"]');
    const status = form.parentElement.querySelector("[data-comment-status]");
    const content = input.value.trim();

    if (form.dataset.submitting === "true") {
      return;
    }

    if (!content) {
      input.focus();
      return;
    }

    status.textContent = "Adding comment...";
    form.dataset.submitting = "true";
    input.disabled = true;
    submitButton.disabled = true;

    try {
      await service.addComment(issueId, content);
      const issue = await service.getIssueDetails(issueId);
      const thread = form.parentElement.querySelector("[data-comment-thread]");
      thread.innerHTML = renderers.renderComments(issue.comments);
      input.value = "";
      status.textContent = "Comment added.";
    } catch (error) {
      status.textContent = error.message || "The comment could not be added.";
    } finally {
      delete form.dataset.submitting;
      input.disabled = false;
      submitButton.disabled = false;
      input.focus();
    }
  }

  function selectRating(button) {
    const panel = button.closest("[data-rating-panel]");
    const selectedScore = Number(button.dataset.score);
    panel.dataset.selectedRating = String(selectedScore);

    panel.querySelectorAll('[data-action="select-rating"]').forEach((ratingButton) => {
      const score = Number(ratingButton.dataset.score);
      ratingButton.setAttribute("aria-pressed", String(score === selectedScore));
      const icon = ratingButton.querySelector("i");
      icon.className = `bi ${score <= selectedScore ? "bi-star-fill" : "bi-star"}`;
    });
  }

  async function submitRating(button) {
    const panel = button.closest("[data-rating-panel]");
    const issueId = Number(panel.dataset.issueId);
    const score = Number(panel.dataset.selectedRating);
    const feedback = panel.querySelector("[data-rating-feedback]").value.trim();
    const status = panel.querySelector("[data-rating-status]");

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      status.textContent = "Choose a rating from 1 to 5 stars.";
      return;
    }

    button.disabled = true;
    status.textContent = "Saving feedback...";

    try {
      await service.submitRating(issueId, score, feedback);
      status.textContent = "Thank you. Your feedback has been saved.";
    } catch (error) {
      status.textContent = error.message || "The rating could not be saved.";
    } finally {
      button.disabled = false;
    }
  }

  function updateGovernorate() {
    if (!elements.issueRegion || !elements.issueGovernorate || !state.dashboard) {
      return;
    }

    const region = asArray(state.dashboard.regions).find(
      (item) => Number(item.regionId) === Number(elements.issueRegion.value)
    );
    elements.issueGovernorate.value = region ? region.governorate : "";
  }

  function closeCreateModal() {
    const modalElement = byId("createIssueModal");
    if (modalElement && global.bootstrap && global.bootstrap.Modal) {
      global.bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    }
  }

  async function createIssue(form) {
    const submitButton = form.querySelector('[type="submit"]');
    const formData = new FormData(form);
    const latitude = Number.parseFloat(formData.get("issueLatitude"));
    const longitude = Number.parseFloat(formData.get("issueLongitude"));
    const payload = {
      title: String(formData.get("issueTitle") || "").trim(),
      description: String(formData.get("issueDescription") || "").trim(),
      location: String(formData.get("issueLocation") || "").trim(),
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      priority: String(formData.get("priority") || "Medium"),
      categoryId: Number(formData.get("issueCategory")),
      regionId: Number(formData.get("issueRegion"))
    };

    setCreateIssueStatus("", "info");
    submitButton.disabled = true;
    form.setAttribute("aria-busy", "true");
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Submitting issue...';

    try {
      await service.createIssue(payload);
      state.dashboard = await service.getDashboardData();
      form.reset();
      byId("priorityMedium").checked = true;
      elements.issueGovernorate.value = "";
      elements.issueLatitude.value = "";
      elements.issueLongitude.value = "";
      renderDashboard();
      setCreateIssueStatus("", "info");
      closeCreateModal();
      setPageStatus("The issue was added successfully.", "success");
    } catch (error) {
      setCreateIssueStatus(error.message || "The issue could not be created.", "danger");
      elements.createIssueStatus.focus();
    } finally {
      form.removeAttribute("aria-busy");
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="bi bi-send-fill me-2" aria-hidden="true"></i>Submit Issue';
    }
  }

  function initializeLocationCapture() {
    if (!elements.locationButton || !elements.locationStatus) {
      return;
    }

    if (!global.navigator.geolocation) {
      elements.locationStatus.textContent = "Location capture is not supported in this browser.";
      return;
    }

    elements.locationButton.disabled = false;
    elements.locationButton.removeAttribute("aria-disabled");
    elements.locationStatus.textContent = "Use your device location, or enter the location manually.";
  }

  function captureCurrentLocation() {
    elements.locationButton.disabled = true;
    elements.locationStatus.className = "location-capture__status is-loading";
    elements.locationStatus.textContent = "Requesting your device location...";

    global.navigator.geolocation.getCurrentPosition(
      (position) => {
        elements.issueLatitude.value = position.coords.latitude.toFixed(6);
        elements.issueLongitude.value = position.coords.longitude.toFixed(6);
        elements.locationStatus.className = "location-capture__status is-success";
        elements.locationStatus.textContent = "Coordinates captured. Add a nearby street or landmark before submitting.";
        elements.locationButton.disabled = false;
      },
      (error) => {
        elements.locationStatus.className = "location-capture__status is-error";
        elements.locationStatus.textContent = error.message || "Location permission was not granted.";
        elements.locationButton.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  function bindFilterEvents() {
    elements.searchInput.addEventListener("input", (event) => {
      global.clearTimeout(searchTimer);
      searchTimer = global.setTimeout(() => {
        state.filters.search = event.target.value;
        renderFilteredContent();
      }, 150);
    });

    [
      [elements.sortFilter, "sort"],
      [elements.statusFilter, "status"],
      [elements.priorityFilter, "priority"],
      [elements.departmentFilter, "department"],
      [elements.categoryFilter, "category"]
    ].forEach(([select, key]) => {
      select.addEventListener("change", (event) => {
        state.filters[key] = event.target.value;
        renderFilteredContent();
      });
    });

    Object.entries(statusRadioMap).forEach(([id, status]) => {
      byId(id).addEventListener("change", (event) => {
        if (event.target.checked) {
          state.filters.status = status;
          renderFilteredContent();
        }
      });
    });

    byId("resetFiltersButton").addEventListener("click", clearFilters);
    byId("clearAllFiltersButton").addEventListener("click", clearFilters);
  }

  function bindDelegatedEvents() {
    elements.gallery.addEventListener("click", (event) => {
      const openButton = event.target.closest('[data-action="open-issue"]');
      const clearButton = event.target.closest('[data-action="clear-filters"]');
      if (openButton) {
        showIssueDetails(openButton.dataset.issueId, openButton);
      } else if (clearButton) {
        clearFilters();
        global.requestAnimationFrame(() => elements.searchInput.focus());
      }
    });

    elements.activeFilterChips.addEventListener("click", (event) => {
      const button = event.target.closest('[data-action="remove-filter"]');
      if (button) {
        removeFilter(button.dataset.filter);
      }
    });

    elements.detailHost.addEventListener("submit", (event) => {
      const form = event.target.closest('form[data-action="add-comment"]');
      if (form) {
        event.preventDefault();
        addComment(form);
      }
    });

    elements.detailHost.addEventListener("click", (event) => {
      const ratingButton = event.target.closest('[data-action="select-rating"]');
      const submitButton = event.target.closest('[data-action="submit-rating"]');
      if (ratingButton) {
        selectRating(ratingButton);
      } else if (submitButton) {
        submitRating(submitButton);
      }
    });
  }

  function bindFormEvents() {
    const createModal = byId("createIssueModal");
    if (createModal) {
      createModal.addEventListener("show.bs.modal", () => setCreateIssueStatus("", "info"));
    }

    elements.createIssueForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (elements.createIssueForm.reportValidity()) {
        createIssue(elements.createIssueForm);
      }
    });
    elements.issueRegion.addEventListener("change", updateGovernorate);
    elements.locationButton.addEventListener("click", captureCurrentLocation);
  }

  async function openLinkedIssueFromUrl() {
    const rawIssueId = new URLSearchParams(global.location.search).get("issueId");
    if (!rawIssueId) {
      return;
    }

    const issueId = Number(rawIssueId);
    const issueExists = Number.isInteger(issueId) && issueId > 0
      && asArray(state.dashboard.issues).some((issue) => Number(issue.issueId) === issueId);
    if (!issueExists) {
      setPageStatus("The linked issue could not be found.", "warning");
      return;
    }

    const trigger = elements.gallery.querySelector(
      `[data-action="open-issue"][data-issue-id="${renderers.safeDomId(issueId)}"]`
    );
    await showIssueDetails(issueId, trigger);
  }

  async function start() {
    if (shell && !shell.isPageAllowed()) {
      return;
    }

    cacheElements();

    if (!service || !renderers || !elements.gallery) {
      throw new Error("The My Issues frontend modules were not loaded in the expected order.");
    }

    bindFilterEvents();
    bindDelegatedEvents();
    bindFormEvents();
    initializeLocationCapture();
    elements.gallery.innerHTML = `
      <div class="ocsp-card p-4 text-center" role="status">
        <span class="spinner-border text-primary mx-auto mb-3" aria-hidden="true"></span>
        <span>Loading issues...</span>
      </div>`;

    try {
      state.dashboard = await service.getDashboardData();
      renderDashboard();
      await openLinkedIssueFromUrl();
    } catch (error) {
      elements.gallery.innerHTML = `
        <div class="alert alert-danger" role="alert">
          ${renderers.escapeHtml(error.message || "The issue data could not be loaded.")}
        </div>`;
      elements.gallery.setAttribute("aria-busy", "false");
    }
  }

  global.document.addEventListener("DOMContentLoaded", () => {
    start().catch((error) => {
      const status = byId("pageStatus");
      if (status) {
        status.className = "alert alert-danger mb-4";
        status.textContent = error.message;
      }
    });
  });
})(window);
