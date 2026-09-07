(function initializeMyIssuesPage(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const service = ocsp.dataService;
  const renderers = ocsp.issueRenderers;
  const shell = ocsp.siteSession;
  const session = ocsp.sessionService;
  const motion = ocsp.animations;
  const feedback = ocsp.feedback;

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
  let imageObserver = null;
  const imageLoadTasks = new Map();
  const attachmentRevisions = new Map();
  const pendingAttachments = new Map();
  const activeIssueImageUpdates = new Set();
  let activeAttachmentRetryIssueId = null;

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function byId(id) {
    return global.document.getElementById(id);
  }

  // Consume notification deep links once so refresh does not reopen a stale modal.
  function consumeIssueLink() {
    const url = new URL(global.location.href);
    url.searchParams.delete("issueId");
    global.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
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
      issueImageUrl: byId("issueImageUrl"),
      locationButton: byId("useCurrentLocation"),
      locationStatus: byId("locationStatus"),
      pageStatus: byId("pageStatus"),
      attachmentRetryStatus: byId("attachmentRetryStatus")
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
    if (motion) motion.revealStatus(elements.pageStatus);
    if (feedback && ["success", "danger", "warning"].includes(alertTone)) {
      feedback.show(message, { tone: alertTone, announce: false });
    }
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
    if (motion) motion.revealStatus(elements.createIssueStatus);
    if (feedback && ["success", "danger", "warning"].includes(safeTone)) {
      feedback.show(message, { tone: safeTone, announce: false });
    }
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

    const notificationCount = byId("notificationCount");
    const heroTotal = byId("heroIssueTotal");
    const heroSummary = byId("heroIssueSummary");
    const heroResolved = byId("heroResolvedCount");

    // The shared site-session component owns header identity on every page.
    if (notificationCount) {
      notificationCount.textContent = String(unreadCount);
      notificationCount.hidden = unreadCount === 0;
      notificationCount.setAttribute(
        "aria-label",
        `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
      );
      if (motion) motion.pulse(notificationCount, unreadCount);
    }
    if (heroTotal) {
      if (motion) {
        motion.countTo(heroTotal, issues.length, {
          format: (value) => `${Math.round(value)} total issue${Math.round(value) === 1 ? "" : "s"}`
        });
      } else {
        heroTotal.textContent = `${issues.length} total issue${issues.length === 1 ? "" : "s"}`;
      }
    }
    if (heroSummary) {
      heroSummary.textContent = issues.length === 0
        ? "Your submitted reports will appear here."
        : activeCount
          ? `${activeCount} report${activeCount === 1 ? " is" : "s are"} awaiting or receiving municipal action.`
          : "All of your reports have been resolved.";
    }
    if (heroResolved) {
      if (motion) {
        motion.countTo(heroResolved, resolvedCount, {
          format: (value) => `${Math.round(value)} resolved`
        });
      } else {
        heroResolved.textContent = `${resolvedCount} resolved`;
      }
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
        if (motion) motion.countTo(output, value);
        else output.textContent = String(value);
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

    elements.issueCategory.disabled = categories.length === 0;
    elements.issueRegion.disabled = regions.length === 0;
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

  function getIssueById(issueId) {
    return asArray(state.dashboard && state.dashboard.issues).find(
      (issue) => Number(issue.issueId) === Number(issueId)
    ) || null;
  }

  function applyAttachmentsToIssue(issueId, attachments) {
    const issue = getIssueById(issueId);
    if (!issue) return null;

    const normalized = asArray(attachments);
    const image = normalized.find(
      (attachment) => String(attachment.fileType || "").toLowerCase() === "image"
        && attachment.fileUrl
    );
    const ui = { ...(issue.ui || {}), attachmentsLoaded: true };

    if (image) {
      ui.imageUrl = image.fileUrl;
      ui.imageAlt = issue.title;
      ui.previewLabel = "Issue photo";
    } else {
      delete ui.imageUrl;
    }

    issue.attachments = normalized;
    issue.ui = ui;
    return issue;
  }

  function refreshIssueCardImage(issue) {
    if (!issue || !elements.gallery) return;
    const card = elements.gallery.querySelector(
      '[data-issue-id="' + renderers.safeDomId(issue.issueId) + '"]'
    );
    const media = card && card.querySelector(".issue-card-media");
    if (media) media.outerHTML = renderers.renderIssueImage(issue);
  }

  async function hydrateIssueImage(issueId) {
    const issue = getIssueById(issueId);
    if (!issue || (issue.ui && issue.ui.attachmentsLoaded)) return;
    if (imageLoadTasks.has(issueId)) return imageLoadTasks.get(issueId);

    const revision = attachmentRevisions.get(issueId) || 0;
    const task = service.getIssueAttachments(issueId)
      .then((attachments) => {
        if ((attachmentRevisions.get(issueId) || 0) !== revision) return;
        const updatedIssue = applyAttachmentsToIssue(issueId, attachments);
        refreshIssueCardImage(updatedIssue);

        // A previous attachment request may have succeeded on the server even if
        // the browser timed out. Clear its saved retry once hydration confirms it.
        const pending = pendingAttachments.get(issueId);
        const savedImageExists = pending
          && hasImageAttachment(attachments, pending.imageUrl);

        if (savedImageExists && activeAttachmentRetryIssueId !== issueId) {
          const activeElement = global.document.activeElement;
          const focusedRetry = elements.attachmentRetryStatus.contains(activeElement)
            && activeElement.matches('[data-action="retry-image-attachment"]')
            ? Number(activeElement.dataset.issueId)
            : null;
          pendingAttachments.delete(issueId);
          persistPendingAttachments();
          renderAttachmentRetries(
            focusedRetry && pendingAttachments.has(focusedRetry) ? focusedRetry : null
          );
          if (focusedRetry === issueId) {
            setPageStatus("The saved image is already attached.", "success");
            elements.pageStatus.focus();
          }
        }
      })
      // Thumbnail hydration is optional. A failed background request can retry
      // when filters render the card again without blocking the issue list.
      .catch(() => {})
      .finally(() => imageLoadTasks.delete(issueId));
    imageLoadTasks.set(issueId, task);
    return task;
  }

  function hydrateVisibleIssueImages() {
    if (imageObserver) imageObserver.disconnect();
    const cards = Array.from(elements.gallery.querySelectorAll("[data-issue-id]"));
    const pendingCards = cards.filter((card) => {
      const issue = getIssueById(card.dataset.issueId);
      return issue && !(issue.ui && issue.ui.attachmentsLoaded);
    });
    if (!pendingCards.length) return;

    if (typeof global.IntersectionObserver !== "function") {
      const issueIds = pendingCards.map((card) => Number(card.dataset.issueId));
      let cursor = 0;
      const worker = async () => {
        while (cursor < issueIds.length) {
          const issueId = issueIds[cursor++];
          await hydrateIssueImage(issueId);
        }
      };
      Array.from({ length: Math.min(3, issueIds.length) }, () => worker());
      return;
    }

    // Load thumbnails only as cards approach the viewport so attachments do
    // not delay the initial issue list or recreate the previous heavy loading.
    const observer = new global.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        hydrateIssueImage(Number(entry.target.dataset.issueId));
      });
    }, { rootMargin: "160px 0px" });
    imageObserver = observer;
    pendingCards.forEach((card) => observer.observe(card));
  }

  function renderIssues() {
    elements.gallery.setAttribute("aria-busy", "true");
    const visibleIssues = getVisibleIssues();
    const totalIssues = asArray(state.dashboard.issues).length;

    // A new account needs guidance, while an empty filtered result needs filter controls.
    if (totalIssues === 0) {
      elements.gallery.innerHTML = `
        <section class="issues-empty-state" aria-labelledby="noIssuesTitle">
          <div class="issues-empty-state__content">
            <span class="issues-empty-state__icon" aria-hidden="true">
              <i class="bi bi-clipboard2-plus"></i>
            </span>
            <h3 id="noIssuesTitle">No issues have been created yet</h3>
            <p>Create your first report using the “Create a new issue” button at the top of this page.</p>
          </div>
        </section>`;
    } else if (!visibleIssues.length) {
      elements.gallery.innerHTML = `
        <section class="issues-empty-state issues-empty-state--filtered" aria-labelledby="noMatchingIssuesTitle">
          <div class="issues-empty-state__content">
            <span class="issues-empty-state__icon" aria-hidden="true">
              <i class="bi bi-search"></i>
            </span>
            <h3 id="noMatchingIssuesTitle">No matching issues</h3>
            <p>Try changing your search or filters.</p>
            <button class="ocsp-button ocsp-button--cancel" data-action="clear-filters" type="button">Clear filters</button>
          </div>
        </section>`;
    } else {
      elements.gallery.innerHTML = `
        <div class="issues-list">
          ${visibleIssues.map(renderers.renderIssueCard).join("")}
        </div>`;
    }

    if (motion) {
      const firstRender = elements.gallery.dataset.ocspMotionRendered !== "true";
      motion.revealList(elements.gallery, ".issue-card, .issues-empty-state, .alert", {
        stagger: firstRender,
        interval: firstRender ? 36 : 0,
        duration: firstRender ? 240 : 160,
        distance: firstRender ? 12 : 6
      });
      elements.gallery.dataset.ocspMotionRendered = "true";
    }

    if (elements.resultSummary) {
      elements.resultSummary.textContent = totalIssues === 0
        ? "No issues submitted yet."
        : `Showing ${visibleIssues.length} of ${totalIssues} issue${totalIssues === 1 ? "" : "s"}.`;
    }
    elements.gallery.setAttribute("aria-busy", "false");
    hydrateVisibleIssueImages();
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
    if (motion) {
      motion.revealList(elements.activeFilterChips, ":scope > .badge", {
        interval: 35,
        duration: 180,
        distance: 6
      });
    }
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

    const warnings = asArray(state.dashboard.warnings);
    if (warnings.length) {
      setPageStatus(
        `Some supporting issue data could not be loaded: ${warnings.join(", ")}.`,
        "warning"
      );
    }
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
      const currentUserId = Number(
        state.dashboard.currentUser && state.dashboard.currentUser.userId
      );
      const editableImage = asArray(issue.attachments).find(
        (attachment) => String(attachment.fileType || "").toLowerCase() === "image"
          && Number(attachment.uploadedById) === currentUserId
      ) || null;

      // General issue fields have no citizen update endpoint. Expose the
      // supported image URL update only when attachments loaded successfully.
      issue.ui = {
        ...(issue.ui || {}),
        imageUpdateAvailable: !asArray(issue.warnings).includes("attachments"),
        editableImageUrl: editableImage ? editableImage.fileUrl : ""
      };
      state.openIssueId = Number(issueId);
      elements.detailHost.innerHTML = renderers.renderIssueDetailModal(issue);
      if (motion) {
        motion.revealWithin(elements.detailHost, { interval: 45, distance: 8 });
      }
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
        consumeIssueLink();
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
    if (motion) motion.setButtonBusy(submitButton, true, "Adding comment...");
    else submitButton.disabled = true;

    try {
      const response = await service.addComment(issueId, content);
      const user = state.dashboard.currentUser || {};
      const comment = {
        issueId,
        userId: user.userId,
        userName: user.name || "Citizen",
        content,
        isStaffComment: false,
        commentDate: new Date().toISOString(),
        ...(response && typeof response === "object" ? response : {})
      };
      const thread = form.parentElement.querySelector("[data-comment-thread]");

      // The POST already succeeded. Render its DTO locally so a later GET
      // failure cannot invite the citizen to submit the same comment twice.
      thread.querySelector("[data-empty-comments]")?.remove();
      thread.insertAdjacentHTML("beforeend", renderers.renderComments([comment]));
      if (motion) {
        motion.revealList(thread, ".comment-card", {
          stagger: false,
          duration: 220,
          distance: 7
        });
      }
      input.value = "";
      status.textContent = "Comment added.";
      if (feedback) feedback.success("Comment added.", { announce: false });
    } catch (error) {
      const message = error.message || "The comment could not be added.";
      status.textContent = message;
      if (feedback) feedback.error(message, { announce: false });
    } finally {
      delete form.dataset.submitting;
      input.disabled = false;
      if (motion) motion.setButtonBusy(submitButton, false);
      else submitButton.disabled = false;
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
    const ratingId = Number(panel.dataset.ratingId) || null;
    const score = Number(panel.dataset.selectedRating);
    const feedbackText = panel.querySelector("[data-rating-feedback]").value.trim();
    const status = panel.querySelector("[data-rating-status]");

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      status.textContent = "Choose a rating from 1 to 5 stars.";
      return;
    }

    if (motion) {
      motion.setButtonBusy(button, true, ratingId ? "Updating feedback..." : "Saving feedback...");
    } else {
      button.disabled = true;
    }
    status.textContent = ratingId ? "Updating feedback..." : "Saving feedback...";

    try {
      const response = await service.saveRating(ratingId, issueId, score, feedbackText);
      const user = state.dashboard.currentUser || {};
      const savedRating = {
        ratingId,
        issueId,
        userId: user.userId,
        score,
        feedback: feedbackText || null,
        ratedAt: new Date().toISOString(),
        ...(response && typeof response === "object" ? response : {})
      };

      // Keep the returned database ID so later submissions use PUT, not a
      // duplicate create request.
      panel.dataset.ratingId = String(savedRating.ratingId || "");
      const issue = asArray(state.dashboard.issues).find(
        (item) => Number(item.issueId) === issueId
      );
      if (issue) {
        issue.rating = savedRating;
      }
      button.innerHTML = '<i class="bi bi-send-fill" aria-hidden="true"></i> Update Feedback';
      status.textContent = "Thank you. Your feedback has been saved.";
      if (feedback) feedback.success("Your feedback has been saved.", { announce: false });
    } catch (error) {
      const message = error.message || "The rating could not be saved.";
      status.textContent = message;
      if (feedback) feedback.error(message, { announce: false });
    } finally {
      if (motion) motion.setButtonBusy(button, false);
      else button.disabled = false;
      if (panel.dataset.ratingId) {
        button.innerHTML = '<i class="bi bi-send-fill" aria-hidden="true"></i> Update Feedback';
      }
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

  function isSupportedImageUrl(value) {
    try {
      const parsed = new URL(value);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch (_error) {
      return false;
    }
  }

  function isMatchingImageAttachment(attachment, imageUrl) {
    return String(attachment && attachment.fileUrl || "").trim() === imageUrl
      && String(attachment && attachment.fileType || "").toLowerCase() === "image";
  }

  function hasImageAttachment(attachments, imageUrl) {
    return asArray(attachments).some(
      (attachment) => isMatchingImageAttachment(attachment, imageUrl)
    );
  }

  async function findExistingImageAttachment(issueId, imageUrl) {
    try {
      const attachments = await service.getIssueAttachments(issueId);
      return attachments.find(
        (attachment) => isMatchingImageAttachment(attachment, imageUrl)
      ) || null;
    } catch (_error) {
      return null;
    }
  }

  async function attachImageToIssue(issueId, imageUrl, reconcileFirst) {
    if (reconcileFirst) {
      const existing = await findExistingImageAttachment(issueId, imageUrl);
      if (existing) return existing;
    }

    try {
      return await service.createAttachment({ issueId, fileUrl: imageUrl, fileType: "Image" });
    } catch (error) {
      // A timeout can happen after the server commits. Reconcile before showing
      // Retry so a second click never creates a misleading duplicate request.
      const existing = await findExistingImageAttachment(issueId, imageUrl);
      if (existing) return existing;
      throw error;
    }
  }

  async function updateImageAttachmentForIssue(issueId, attachmentId, imageUrl) {
    try {
      return await service.updateAttachment(attachmentId, {
        fileUrl: imageUrl,
        fileType: "Image"
      });
    } catch (error) {
      // A timed-out PUT can still have committed. Confirm the exact attachment
      // before reporting a failure or inviting another submission.
      const saved = await findExistingImageAttachment(issueId, imageUrl);
      if (saved && Number(saved.attachmentId) === Number(attachmentId)) return saved;
      throw error;
    }
  }

  function mergeAttachmentIntoIssue(issueId, attachment, baseAttachments) {
    const issue = getIssueById(issueId);
    if (!issue || !attachment) return;
    attachmentRevisions.set(issueId, (attachmentRevisions.get(issueId) || 0) + 1);
    const sourceAttachments = baseAttachments === undefined
      ? issue.attachments
      : baseAttachments;
    const attachments = asArray(sourceAttachments).filter(
      (item) => Number(item.attachmentId) !== Number(attachment.attachmentId)
        && String(item.fileUrl || "") !== String(attachment.fileUrl || "")
    );
    attachments.unshift(attachment);
    refreshIssueCardImage(applyAttachmentsToIssue(issueId, attachments));
  }

  function pendingAttachmentStorageKey() {
    const user = (state.dashboard && state.dashboard.currentUser)
      || (session && session.getUser ? session.getUser() : null);
    const userId = Number(user && user.userId);
    return userId > 0 ? "ocsp:pending-image-attachments:" + userId : "";
  }

  function persistPendingAttachments() {
    const key = pendingAttachmentStorageKey();
    if (!key) return;
    try {
      const storage = global.sessionStorage;
      if (!storage) return;
      const records = Array.from(pendingAttachments.values()).map((pending) => ({
        issueId: pending.issueId,
        imageUrl: pending.imageUrl
      }));
      if (records.length) storage.setItem(key, JSON.stringify(records));
      else storage.removeItem(key);
    } catch (_error) {
      // Storage can be disabled; the visible same-page retry remains available.
    }
  }

  function renderAttachmentRetries(focusIssueId) {
    const host = elements.attachmentRetryStatus;
    host.textContent = "";
    if (!pendingAttachments.size) {
      host.className = "d-none";
      host.removeAttribute("aria-busy");
      return;
    }

    host.className = "alert alert-warning mb-4";
    if (activeAttachmentRetryIssueId !== null) host.setAttribute("aria-busy", "true");
    else host.removeAttribute("aria-busy");

    const heading = global.document.createElement("strong");
    heading.className = "d-block mb-2";
    heading.textContent = "Some issue images still need to be attached.";
    host.append(heading);

    pendingAttachments.forEach((_pending, issueId) => {
      const row = global.document.createElement("div");
      row.className = "d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mt-2";
      const message = global.document.createElement("span");
      message.textContent = "Issue #" + issueId
        + ": retry the saved image URL without creating another issue.";
      const retryButton = global.document.createElement("button");
      retryButton.type = "button";
      retryButton.className = "ocsp-button ocsp-button--cancel flex-shrink-0";
      retryButton.dataset.action = "retry-image-attachment";
      retryButton.dataset.issueId = String(issueId);
      retryButton.setAttribute("aria-label", "Retry image for issue #" + issueId);
      retryButton.disabled = activeAttachmentRetryIssueId !== null
        || activeIssueImageUpdates.has(issueId);
      retryButton.innerHTML = activeAttachmentRetryIssueId === issueId
        ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Retrying image...'
        : '<i class="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>Retry image';
      row.append(message, retryButton);
      host.append(row);
    });

    if (focusIssueId) {
      global.requestAnimationFrame(() => {
        const selector = '[data-issue-id="' + renderers.safeDomId(focusIssueId) + '"]';
        host.querySelector(selector)?.focus();
      });
    }
  }

  function restorePendingAttachments() {
    const key = pendingAttachmentStorageKey();
    if (!key) return;
    try {
      const storage = global.sessionStorage;
      if (!storage) return;
      const issueIds = new Set(
        asArray(state.dashboard.issues).map((issue) => Number(issue.issueId))
      );
      const records = JSON.parse(storage.getItem(key) || "[]");
      pendingAttachments.clear();
      asArray(records).forEach((record) => {
        const issueId = Number(record && record.issueId);
        const imageUrl = String((record && record.imageUrl) || "").trim();
        if (issueIds.has(issueId) && isSupportedImageUrl(imageUrl)) {
          pendingAttachments.set(issueId, { issueId, imageUrl });
        }
      });
      persistPendingAttachments();
      renderAttachmentRetries();
    } catch (_error) {
      try {
        global.sessionStorage.removeItem(key);
      } catch (_storageError) {
        // Ignore unavailable storage; the rest of the issue page remains usable.
      }
    }
  }

  function showAttachmentRetry(issueId, imageUrl, focusRetry) {
    const numericIssueId = Number(issueId);
    pendingAttachments.set(numericIssueId, { issueId: numericIssueId, imageUrl });
    persistPendingAttachments();
    renderAttachmentRetries(focusRetry ? numericIssueId : null);
    if (feedback) {
      feedback.warning(
        "The issue was created, but its image could not be attached. Use Retry image without creating another issue.",
        { announce: false, key: "attachment-retry-" + numericIssueId }
      );
    }
  }

  async function retryPendingAttachment(button) {
    const issueId = Number(button.dataset.issueId);
    const pending = pendingAttachments.get(issueId);
    if (
      !pending
      || activeAttachmentRetryIssueId !== null
      || activeIssueImageUpdates.has(issueId)
    ) return;
    activeAttachmentRetryIssueId = issueId;
    renderAttachmentRetries();

    try {
      const attachment = await attachImageToIssue(
        pending.issueId,
        pending.imageUrl,
        true
      );
      mergeAttachmentIntoIssue(pending.issueId, attachment);
      if (pendingAttachments.get(issueId)?.imageUrl === pending.imageUrl) {
        pendingAttachments.delete(issueId);
      }
      activeAttachmentRetryIssueId = null;
      persistPendingAttachments();
      renderAttachmentRetries();
      setPageStatus("The image was attached successfully.", "success");
      elements.pageStatus.focus();
    } catch (_error) {
      activeAttachmentRetryIssueId = null;
      const currentPending = pendingAttachments.get(issueId);
      const issue = getIssueById(issueId);
      if (currentPending?.imageUrl === pending.imageUrl
        && hasImageAttachment(issue && issue.attachments, pending.imageUrl)) {
        pendingAttachments.delete(issueId);
        persistPendingAttachments();
        renderAttachmentRetries();
        setPageStatus("The image was attached successfully.", "success");
        elements.pageStatus.focus();
      } else if (currentPending?.imageUrl === pending.imageUrl) {
        showAttachmentRetry(pending.issueId, pending.imageUrl, true);
      } else {
        renderAttachmentRetries();
      }
    }
  }

  function canUpdateCitizenIssue(issue) {
    return Boolean(issue && ["Open", "InProgress"].includes(issue.currentStatus));
  }

  function setImageUpdateStatus(form, message, tone) {
    const status = form.querySelector("[data-image-update-status]");
    if (!status) return;
    const toneClass = {
      danger: "text-danger",
      warning: "text-warning",
      info: "text-muted"
    }[tone] || "";
    status.className = `small mb-3 ${toneClass}`.trim();
    status.textContent = message || "";
  }

  function setImageUpdatePanel(toggle, expanded) {
    const panelId = toggle && toggle.getAttribute("aria-controls");
    const panel = panelId ? byId(panelId) : null;
    if (!panel) return;
    panel.hidden = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    if (expanded) {
      const form = panel.querySelector('form[data-action="update-issue-image"]');
      if (form) setImageUpdateStatus(form, "", "info");
      global.requestAnimationFrame(() => panel.querySelector('input[name="imageUrl"]')?.focus());
    } else {
      toggle.focus();
    }
  }

  function closeCitizenIssueDetails(form) {
    const modalElement = form.closest(".modal");
    if (modalElement && global.bootstrap && global.bootstrap.Modal) {
      global.bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    }
  }

  async function updateIssueImage(form) {
    if (form.dataset.submitting === "true" || !form.reportValidity()) return;

    const issueId = Number(form.dataset.issueId);
    const localIssue = getIssueById(issueId);
    const input = form.querySelector('input[name="imageUrl"]');
    const submitButton = form.querySelector('[type="submit"]');
    const imageUrl = String(input.value || "").trim();

    if (!canUpdateCitizenIssue(localIssue)) {
      const message = "Only Open or In Progress issues can update their image.";
      setImageUpdateStatus(form, message, "warning");
      if (feedback) feedback.warning(message, { announce: false });
      return;
    }

    // Do not let an older queued upload race with a new URL for this issue.
    if (
      activeAttachmentRetryIssueId === issueId
      || activeIssueImageUpdates.has(issueId)
    ) {
      const message = "Wait for the current image retry to finish, then update the image.";
      setImageUpdateStatus(form, message, "warning");
      if (feedback) feedback.warning(message, { announce: false });
      return;
    }

    if (!isSupportedImageUrl(imageUrl)) {
      setImageUpdateStatus(
        form,
        "Enter an image URL beginning with http:// or https://.",
        "danger"
      );
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }

    input.removeAttribute("aria-invalid");
    setImageUpdateStatus(form, "Checking the latest issue status...", "info");
    form.dataset.submitting = "true";
    form.setAttribute("aria-busy", "true");
    const originalButtonHtml = submitButton.innerHTML;
    const cancelButton = form.querySelector('[data-action="cancel-issue-image-update"]');
    const updateToggle = form.closest(".modal")?.querySelector(
      '[data-action="toggle-issue-image-update"]'
    );
    input.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
    if (updateToggle) updateToggle.disabled = true;
    activeIssueImageUpdates.add(issueId);
    renderAttachmentRetries();
    if (motion) motion.setButtonBusy(submitButton, true, "Saving image...");
    else {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Saving image...';
    }

    try {
      // Re-fetch before writing because status may have changed while the
      // details dialog was open. The backend does not enforce this UI rule.
      const latest = await service.getIssueDetails(issueId);
      if (!canUpdateCitizenIssue(latest)) {
        localIssue.currentStatus = latest.currentStatus;
        renderDashboard();
        state.openIssueTrigger = elements.gallery.querySelector(
          '[data-action="open-issue"][data-issue-id="'
            + renderers.safeDomId(issueId)
            + '"]'
        );
        const message = "This issue can no longer be updated because it is resolved.";
        if (feedback) feedback.warning(message);
        else setPageStatus(message, "warning");
        closeCitizenIssueDetails(form);
        return;
      }

      if (asArray(latest.warnings).includes("attachments")) {
        throw new Error("The current image could not be verified. Please try again.");
      }

      const attachments = asArray(latest.attachments);
      const currentUserId = Number(
        state.dashboard.currentUser && state.dashboard.currentUser.userId
      );
      const exactImage = attachments.find(
        (attachment) => isMatchingImageAttachment(attachment, imageUrl)
      ) || null;
      const ownedImage = attachments.find(
        (attachment) => String(attachment.fileType || "").toLowerCase() === "image"
          && Number(attachment.uploadedById) === currentUserId
      ) || null;
      let savedAttachment;
      let successMessage;

      if (exactImage) {
        savedAttachment = exactImage;
        successMessage = "The image URL is already up to date.";
      } else if (ownedImage) {
        savedAttachment = await updateImageAttachmentForIssue(
          issueId,
          ownedImage.attachmentId,
          imageUrl
        );
        successMessage = "The issue image was updated successfully.";
      } else {
        savedAttachment = await attachImageToIssue(issueId, imageUrl, true);
        successMessage = "The issue image was added successfully.";
      }

      mergeAttachmentIntoIssue(issueId, savedAttachment, attachments);
      // A deliberate update supersedes any older create-image retry for this issue.
      pendingAttachments.delete(issueId);
      persistPendingAttachments();
      renderAttachmentRetries();
      setImageUpdateStatus(form, "", "info");
      if (feedback) feedback.success(successMessage);
      else setPageStatus(successMessage, "success");
      closeCitizenIssueDetails(form);
    } catch (error) {
      const message = error.message || "The issue image could not be updated.";
      setImageUpdateStatus(form, message, "danger");
      if (feedback) feedback.error(message, { announce: false });
    } finally {
      activeIssueImageUpdates.delete(issueId);
      renderAttachmentRetries();
      delete form.dataset.submitting;
      form.removeAttribute("aria-busy");
      input.disabled = false;
      if (cancelButton) cancelButton.disabled = false;
      if (updateToggle) updateToggle.disabled = false;
      if (motion) motion.setButtonBusy(submitButton, false);
      else {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonHtml;
      }
    }
  }

  async function createIssue(form) {
    const submitButton = form.querySelector('[type="submit"]');
    const formData = new FormData(form);
    const latitude = Number.parseFloat(formData.get("issueLatitude"));
    const longitude = Number.parseFloat(formData.get("issueLongitude"));
    const imageUrl = String(formData.get("issueImageUrl") || "").trim();
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

    if (imageUrl && !isSupportedImageUrl(imageUrl)) {
      setCreateIssueStatus("Enter an image URL beginning with http:// or https://.", "danger");
      elements.issueImageUrl.setAttribute("aria-invalid", "true");
      elements.issueImageUrl.focus();
      return;
    }
    elements.issueImageUrl.removeAttribute("aria-invalid");

    setCreateIssueStatus("", "info");
    form.setAttribute("aria-busy", "true");
    if (motion) motion.setButtonBusy(submitButton, true, "Submitting issue...");
    else {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Submitting issue...';
    }

    try {
      const created = await service.createIssue(payload);
      let createdAttachment = null;
      let attachmentError = null;

      // The backend stores attachments separately, so create the issue first
      // and then associate the optional image URL with its returned issue ID.
      if (imageUrl) {
        try {
          createdAttachment = await attachImageToIssue(created.issueId, imageUrl, false);
        } catch (error) {
          attachmentError = error;
        }
      }

      const category = asArray(state.dashboard.categories).find(
        (item) => Number(item.categoryId) === payload.categoryId
      );
      const region = asArray(state.dashboard.regions).find(
        (item) => Number(item.regionId) === payload.regionId
      );

      // The create response is the new database record. Add it locally instead
      // of making a second request that could misreport a successful POST.
      state.dashboard.issues = [{
        ...created,
        categoryId: payload.categoryId,
        regionId: payload.regionId,
        categoryName: created.categoryName || (category && category.categoryName) || "",
        regionName: created.regionName || (region && region.regionName) || "",
        governorate: created.governorate || (region && region.governorate) || "",
        assignedDepartmentName: created.assignedDepartmentName
          || (category && category.departmentName)
          || null,
        attachments: createdAttachment
          ? [createdAttachment]
          : asArray(created.attachments),
        ui: {
          ...(created.ui || {}),
          attachmentsLoaded: !attachmentError,
          ...(createdAttachment
            ? {
                imageUrl: createdAttachment.fileUrl,
                imageAlt: payload.title,
                previewLabel: "Issue photo"
              }
            : {})
        }
      }, ...asArray(state.dashboard.issues)];

      form.reset();
      byId("priorityMedium").checked = true;
      elements.issueGovernorate.value = "";
      elements.issueLatitude.value = "";
      elements.issueLongitude.value = "";
      elements.issueImageUrl.removeAttribute("aria-invalid");
      renderDashboard();
      setCreateIssueStatus("", "info");
      closeCreateModal();
      if (attachmentError) {
        showAttachmentRetry(created.issueId, imageUrl);
      } else if (createdAttachment) {
        setPageStatus("The issue and its image were added successfully.", "success");
      } else {
        setPageStatus("The issue was added successfully.", "success");
      }
    } catch (error) {
      setCreateIssueStatus(error.message || "The issue could not be created.", "danger");
      elements.createIssueStatus.focus();
    } finally {
      form.removeAttribute("aria-busy");
      if (motion) motion.setButtonBusy(submitButton, false);
      else {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="bi bi-send-fill me-2" aria-hidden="true"></i>Submit Issue';
      }
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
        if (feedback) feedback.success("Location coordinates captured.", { announce: false });
        elements.locationButton.disabled = false;
      },
      (error) => {
        const message = error.message || "Location permission was not granted.";
        elements.locationStatus.className = "location-capture__status is-error";
        elements.locationStatus.textContent = message;
        if (feedback) feedback.error(message, { announce: false });
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
      const retryButton = event.target.closest('[data-action="retry-issues"]');
      if (retryButton) {
        loadDashboard();
      } else if (openButton) {
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
      const imageForm = event.target.closest('form[data-action="update-issue-image"]');
      const commentForm = event.target.closest('form[data-action="add-comment"]');
      if (imageForm) {
        event.preventDefault();
        updateIssueImage(imageForm);
      } else if (commentForm) {
        event.preventDefault();
        addComment(commentForm);
      }
    });

    elements.detailHost.addEventListener("click", (event) => {
      const updateToggle = event.target.closest('[data-action="toggle-issue-image-update"]');
      const updateCancel = event.target.closest('[data-action="cancel-issue-image-update"]');
      const ratingButton = event.target.closest('[data-action="select-rating"]');
      const submitButton = event.target.closest('[data-action="submit-rating"]');
      if (updateToggle) {
        const expanded = updateToggle.getAttribute("aria-expanded") !== "true";
        setImageUpdatePanel(updateToggle, expanded);
      } else if (updateCancel) {
        const form = updateCancel.closest('form[data-action="update-issue-image"]');
        const modal = updateCancel.closest(".modal");
        const toggle = modal && modal.querySelector(
          '[data-action="toggle-issue-image-update"]'
        );
        if (form) {
          form.reset();
          form.querySelector('input[name="imageUrl"]')?.removeAttribute("aria-invalid");
          setImageUpdateStatus(form, "", "info");
        }
        if (toggle) setImageUpdatePanel(toggle, false);
      } else if (ratingButton) {
        selectRating(ratingButton);
      } else if (submitButton) {
        submitRating(submitButton);
      }
    });

    elements.detailHost.addEventListener("input", (event) => {
      const input = event.target.closest('input[name="imageUrl"]');
      const form = input && input.closest('form[data-action="update-issue-image"]');
      if (!input || !form) return;
      input.removeAttribute("aria-invalid");
      setImageUpdateStatus(form, "", "info");
    });

    elements.attachmentRetryStatus.addEventListener("click", (event) => {
      const retryButton = event.target.closest('[data-action="retry-image-attachment"]');
      if (retryButton) retryPendingAttachment(retryButton);
    });

    // Broken or non-image URLs return to the existing placeholder instead of
    // leaving a browser error icon on the issue card.
    elements.gallery.addEventListener("error", (event) => {
      const image = event.target.closest(".issue-card-media__image");
      const card = image && image.closest("[data-issue-id]");
      const media = image && image.closest(".issue-card-media");
      const issue = card && getIssueById(card.dataset.issueId);
      if (!image || !media || !issue) return;
      issue.ui = { ...(issue.ui || {}) };
      delete issue.ui.imageUrl;
      media.outerHTML = renderers.renderIssueImage(issue);
    }, true);
  }

  function bindFormEvents() {
    const createModal = byId("createIssueModal");
    if (createModal) {
      let restoreDeepLinkFocus = false;
      createModal.addEventListener("show.bs.modal", () => setCreateIssueStatus("", "info"));
      createModal.addEventListener("hidden.bs.modal", () => {
        if (!restoreDeepLinkFocus) return;
        restoreDeepLinkFocus = false;
        byId("createIssueHeroTrigger")?.focus();
      });

      const clearCreateModalHash = () => {
        if (global.location.hash !== "#createIssueModal") return;
        global.history.replaceState(
          global.history.state,
          "",
          global.location.pathname + global.location.search
        );
      };
      createModal.addEventListener("click", (event) => {
        if (!event.target.closest('[data-bs-dismiss="modal"]')) return;
        clearCreateModalHash();
        if (!global.bootstrap || !global.bootstrap.Modal) {
          global.setTimeout(() => byId("createIssueHeroTrigger")?.focus(), 0);
        }
      });

      // Home links arrive with #createIssueModal. Convert that CSS target into
      // a real Bootstrap modal so its X and Cancel controls can dismiss it.
      if (
        global.location.hash === "#createIssueModal" &&
        global.bootstrap && global.bootstrap.Modal
      ) {
        restoreDeepLinkFocus = true;
        clearCreateModalHash();
        global.bootstrap.Modal.getOrCreateInstance(createModal).show();
      }
    }

    elements.createIssueForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (elements.createIssueForm.reportValidity()) {
        createIssue(elements.createIssueForm);
      }
    });
    elements.issueRegion.addEventListener("change", updateGovernorate);
    elements.issueImageUrl.addEventListener("input", () => {
      elements.issueImageUrl.removeAttribute("aria-invalid");
    });
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
      consumeIssueLink();
      return;
    }

    const trigger = elements.gallery.querySelector(
      `[data-action="open-issue"][data-issue-id="${renderers.safeDomId(issueId)}"]`
    );
    await showIssueDetails(issueId, trigger);
  }

  async function loadDashboard() {
    const flash = session && session.consumeFlash ? session.consumeFlash() : null;
    setPageStatus("", "info");
    if (flash && flash.message) setPageStatus(flash.message, flash.tone);
    elements.gallery.setAttribute("aria-busy", "true");
    if (motion) {
      motion.renderSkeletons(elements.gallery, {
        count: 4,
        variant: "issue",
        label: "Loading issues..."
      });
    } else {
      elements.gallery.innerHTML = `
        <div class="ocsp-card p-4 text-center" role="status">
          <span class="spinner-border text-primary mx-auto mb-3" aria-hidden="true"></span>
          <span>Loading issues...</span>
        </div>`;
    }

    try {
      state.dashboard = await service.getDashboardData();
      restorePendingAttachments();
      renderDashboard();
      await openLinkedIssueFromUrl();
    } catch (error) {
      const message = error.message || "The issue data could not be loaded.";
      elements.gallery.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <p>${renderers.escapeHtml(message)}</p>
          <button class="ocsp-button ocsp-button--submit" data-action="retry-issues" type="button">Try again</button>
        </div>`;
      elements.gallery.setAttribute("aria-busy", "false");
      if (feedback) feedback.error(message, { announce: false });
    }
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
    await loadDashboard();
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
