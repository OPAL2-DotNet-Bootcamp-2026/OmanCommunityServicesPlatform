(function initializeOcspIssueRenderers(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const config = ocsp.config || {};
  const parseApiDate = typeof config.parseApiDate === "function"
    ? config.parseApiDate
    : (value) => new Date(value);

  const statusMap = Object.freeze({
    Open: { key: "open", label: "Open", icon: "bi-inbox" },
    InProgress: { key: "progress", label: "In Progress", icon: "bi-hourglass-split" },
    Resolved: { key: "resolved", label: "Resolved", icon: "bi-check-circle" }
  });

  const priorityMap = Object.freeze({
    Low: { key: "low", label: "Low" },
    Medium: { key: "medium", label: "Medium" },
    High: { key: "high", label: "High" }
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeUrl(value) {
    const candidate = String(value || "").trim();
    if (!candidate) {
      return "";
    }

    const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(candidate);
    if (!hasScheme && !candidate.startsWith("//")) {
      return candidate;
    }

    try {
      const parsed = new URL(candidate, global.document.baseURI);
      return ["http:", "https:"].includes(parsed.protocol) ? candidate : "";
    } catch (_error) {
      return "";
    }
  }

  function safeDomId(value) {
    const safeValue = String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "-");
    return safeValue || "unknown";
  }

  function getStatusMeta(status) {
    return statusMap[status] || {
      key: "neutral",
      label: String(status || "Unknown"),
      icon: "bi-question-circle"
    };
  }

  function getPriorityMeta(priority) {
    return priorityMap[priority] || {
      key: "medium",
      label: String(priority || "Not set")
    };
  }

  function getInitials(name) {
    const parts = String(name || "Citizen")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    return parts.map((part) => part[0].toUpperCase()).join("") || "C";
  }

  function formatDate(value, options) {
    if (!value) {
      return "Latest status";
    }

    const date = parseApiDate(value);
    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    const formatOptions = options || {
      day: "numeric",
      month: "short",
      year: "numeric"
    };

    try {
      return new Intl.DateTimeFormat(config.locale || "en-OM", {
        ...formatOptions,
        timeZone: config.timeZone || "Asia/Muscat"
      }).format(date);
    } catch (_error) {
      return date.toLocaleDateString();
    }
  }

  function formatDateTime(value) {
    return formatDate(value, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function renderIssueImage(issue) {
    const ui = issue.ui || {};
    const imageUrl = safeUrl(ui.imageUrl);
    const alt = escapeHtml(ui.imageAlt || issue.title);
    const imageStyle = ["road", "water", "night", "fixed", "document"].includes(ui.imageStyle)
      ? ui.imageStyle
      : "document";
    const previewLabel = escapeHtml(ui.previewLabel || "Issue photo");

    if (!imageUrl) {
      return `
        <span class="issue-card-media issue-card-media--attachment issue-card-media--document" data-preview-label="No preview" aria-hidden="true">
          <i class="bi bi-image"></i>
        </span>`;
    }

    return `
      <span class="issue-card-media issue-card-media--attachment issue-card-media--${imageStyle}" data-preview-label="${previewLabel}" role="img" aria-label="${alt}">
        <img class="issue-card-media__image" src="${escapeHtml(imageUrl)}" alt="" width="720" height="480" loading="lazy" decoding="async" referrerpolicy="no-referrer">
      </span>`;
  }

  function renderIssueCard(issue) {
    const status = getStatusMeta(issue.currentStatus);
    const priority = getPriorityMeta(issue.priority);
    const issueDomId = safeDomId(issue.issueId);
    const issueTitle = String(issue.title || "Issue").trim() || "Issue";
    const issueTitleAnnouncement = /[.!?]$/.test(issueTitle)
      ? issueTitle
      : `${issueTitle}.`;
    const hasFreshUpdate = Boolean(issue.ui && issue.ui.hasFreshUpdate);
    const freshUpdateLabel = String(
      issue.ui && issue.ui.freshUpdateLabel || "New update"
    ).trim() || "New update";
    const freshUpdateAnnouncement = /[.!?]$/.test(freshUpdateLabel)
      ? freshUpdateLabel
      : `${freshUpdateLabel}.`;

    return `
      <article class="ocsp-card ocsp-card--interactive issue-card issue-card--${status.key} issue-filter-item issue-filter-item--${status.key}${hasFreshUpdate ? " is-updated" : ""}" data-issue-id="${issueDomId}">
        <button
          class="citizen-row-summary issue-card-preview issue-card-trigger"
          type="button"
          data-action="open-issue"
          data-issue-id="${issueDomId}"
          aria-haspopup="dialog"
          aria-label="View details for ${escapeHtml(issueTitleAnnouncement)}${hasFreshUpdate ? ` ${escapeHtml(freshUpdateAnnouncement)}` : ""}">
          <span class="row align-items-center w-100 g-2 text-start">
            <span class="col-auto">${renderIssueImage(issue)}</span>
            <span class="col">
              <span class="issue-title-row">
                <span class="issue-title d-block">${escapeHtml(issue.title)}</span>
                ${hasFreshUpdate ? `<span class="fresh-update" aria-hidden="true"><i class="bi bi-stars"></i>${escapeHtml(freshUpdateLabel)}</span>` : ""}
              </span>
              <span class="issue-meta mt-1 d-block">
                <i class="bi bi-geo-alt me-1" aria-hidden="true"></i>
                ${escapeHtml(issue.location)}
              </span>
            </span>
            <span class="col-md-3 issue-meta">
              <strong>${escapeHtml(issue.categoryName || "Uncategorized")}</strong>
              <small class="d-block text-muted">${escapeHtml(issue.assignedDepartmentName || "Awaiting assignment")}</small>
            </span>
            <span class="col-md-2 text-md-center status-priority-group">
              <span class="status-badge status-badge--${status.key}">${escapeHtml(status.label)}</span>
              <span class="priority-badge priority-badge--${priority.key}">${escapeHtml(priority.label)}</span>
            </span>
            <span class="col-md-2 text-md-end text-muted issue-date">
              <time datetime="${escapeHtml(issue.reportedDate || "")}">${escapeHtml(formatDate(issue.reportedDate))}</time>
              <i class="bi bi-chevron-right ms-2 issue-chevron" aria-hidden="true"></i>
            </span>
          </span>
        </button>
      </article>`;
  }

  function renderAttachments(attachments) {
    if (!Array.isArray(attachments) || !attachments.length) {
      return '<p class="text-muted small mb-0">No attachments were added to this issue.</p>';
    }

    return `
      <div class="attachment-grid">
        ${attachments
          .map((attachment) => {
            const fileUrl = safeUrl(attachment.fileUrl);
            const style = ["road", "water", "night", "fixed", "document"].includes(attachment.style)
              ? attachment.style
              : attachment.fileType === "Image"
                ? "document"
                : "document";
            const label = attachment.label || attachment.fileName || "Attachment";
            const content = `
              <i class="bi ${attachment.fileType === "Image" ? "bi-image" : "bi-file-earmark"}" aria-hidden="true"></i>
              <span>${escapeHtml(label)}</span>`;

            if (!fileUrl) {
              return `<span class="attachment-thumb attachment-thumb--${style}">${content}</span>`;
            }

            return `
              <a class="attachment-thumb attachment-thumb--${style}" href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(label)}">
                ${content}
              </a>`;
          })
          .join("")}
      </div>`;
  }

  function renderTimeline(statusUpdates, emptyMessage) {
    if (!Array.isArray(statusUpdates) || !statusUpdates.length) {
      return `<p class="text-muted small mb-0">${escapeHtml(emptyMessage || "No status updates are available.")}</p>`;
    }

    return `
      <ol class="activity-timeline">
        ${statusUpdates
          .map((update) => {
            const status = getStatusMeta(update.newStatus);
            const isSubmission = !update.previousStatus && update.newStatus === "Open";
            const label = isSubmission ? "Issue Submitted" : status.label;
            const notes = String(update.notes || "").trim();
            const staffLine = !isSubmission && update.updatedById
              ? `<small>Changed by Staff ID: ${escapeHtml(update.updatedById)}</small>`
              : "";
            const notesLine = !isSubmission && notes && notes !== label
              ? `<small>${escapeHtml(notes)}</small>`
              : "";
            return `
              <li class="timeline-item timeline-item--${status.key}">
                <span class="timeline-dot" aria-hidden="true"></span>
                <div>
                  <strong>${escapeHtml(label)}</strong>
                  ${staffLine}
                  ${notesLine}
                  <small>${escapeHtml(formatDateTime(update.updatedAt))}</small>
                </div>
              </li>`;
          })
          .join("")}
      </ol>`;
  }

  function renderComments(comments) {
    if (!Array.isArray(comments) || !comments.length) {
      return '<p class="text-muted small mb-0" data-empty-comments>No comments yet. Add the first update below.</p>';
    }

    return comments
      .map((comment) => {
        const roleKey = comment.isStaffComment ? "admin" : "citizen";
        const roleLabel = comment.isStaffComment ? "Staff" : "Citizen";
        return `
          <article class="ocsp-card comment-card${comment.highlighted ? " comment-card--highlighted" : ""}" role="listitem">
            <div class="comment-avatar comment-avatar--${roleKey}">${escapeHtml(getInitials(comment.userName))}</div>
            <div class="comment-copy">
              <div class="comment-header">
                <div class="comment-author">
                  <strong>${escapeHtml(comment.userName || roleLabel)}</strong>
                  <span class="role-badge role-badge--${roleKey}">${roleLabel}</span>
                </div>
                <time datetime="${escapeHtml(comment.commentDate || "")}">${escapeHtml(formatDateTime(comment.commentDate))}</time>
              </div>
              <p>${escapeHtml(comment.content)}</p>
            </div>
          </article>`;
      })
      .join("");
  }

  function renderRatingPanel(issue) {
    if (issue.currentStatus !== "Resolved") {
      return "";
    }

    const selectedScore = Number(issue.rating && issue.rating.score) || 0;
    const feedback = issue.rating && issue.rating.feedback ? issue.rating.feedback : "";
    const ratingId = Number(issue.rating && issue.rating.ratingId) || "";

    return `
      <div class="ocsp-card rating-panel" data-rating-panel data-issue-id="${safeDomId(issue.issueId)}" data-rating-id="${ratingId}" data-selected-rating="${selectedScore}">
        <div class="rating-copy">
          <h3>Rate this service</h3>
          <p>How satisfied are you with the resolution of this issue?</p>
        </div>
        <div aria-label="Service rating" class="rating-stars" role="group">
          ${[1, 2, 3, 4, 5]
            .map(
              (score) => `
                <button aria-label="Rate ${score} out of 5" aria-pressed="${score === selectedScore}" data-action="select-rating" data-score="${score}" type="button">
                  <i class="bi ${score <= selectedScore ? "bi-star-fill" : "bi-star"}" aria-hidden="true"></i>
                </button>`
            )
            .join("")}
        </div>
        <label class="visually-hidden" for="citizenFeedback-${safeDomId(issue.issueId)}">Optional service feedback</label>
        <textarea class="form-control" id="citizenFeedback-${safeDomId(issue.issueId)}" data-rating-feedback maxlength="500" placeholder="Leave optional feedback..." rows="3">${escapeHtml(feedback)}</textarea>
        <button class="ocsp-button ocsp-button--submit mt-3" data-action="submit-rating" type="button">
          <i class="bi bi-send-fill" aria-hidden="true"></i>
          ${ratingId ? "Update Feedback" : "Submit Feedback"}
        </button>
        <p class="small mt-2 mb-0" data-rating-status aria-live="polite"></p>
      </div>`;
  }

  function renderStatusBanner(issue) {
    const ui = issue.ui || {};
    if (!ui.hasFreshUpdate || !ui.updateTitle) {
      return "";
    }

    const status = getStatusMeta(issue.currentStatus);
    return `
      <div class="status-change-banner${status.key === "resolved" ? " status-change-banner--resolved" : ""}">
        <i class="bi ${status.key === "resolved" ? "bi-check-circle-fill" : "bi-arrow-repeat"}" aria-hidden="true"></i>
        <div>
          <strong>${escapeHtml(ui.updateTitle)}</strong>
          <span>${escapeHtml(ui.updateMessage || "The issue has a new municipal update.")}</span>
        </div>
      </div>`;
  }

  function renderIssueDetailModal(issue) {
    const issueDomId = safeDomId(issue.issueId);
    const mapVariant = issue.ui && ["park", "city"].includes(issue.ui.mapVariant)
      ? ` map-preview--${issue.ui.mapVariant}`
      : "";
    const mapAreaName = (issue.ui && issue.ui.mapAreaName) || issue.regionName || "Issue location";
    const warnings = Array.isArray(issue.warnings) ? issue.warnings : [];
    const ui = issue.ui || {};
    const canUpdateImage = ["Open", "InProgress"].includes(issue.currentStatus)
      && ui.imageUpdateAvailable !== false;
    const imageUpdatePanelId = `citizenIssueUpdatePanel-${issueDomId}`;
    const imageUpdateInputId = `citizenIssueImageUrl-${issueDomId}`;
    const imageUpdateHelpId = `citizenIssueImageHelp-${issueDomId}`;
    const imageUpdateStatusId = `citizenIssueImageStatus-${issueDomId}`;
    const imageUpdateAction = canUpdateImage
      ? `
        <button class="ocsp-button ocsp-button--cancel" type="button" data-action="toggle-issue-image-update" aria-expanded="false" aria-controls="${imageUpdatePanelId}">
          <i class="bi bi-pencil-square" aria-hidden="true"></i>Update issue
        </button>`
      : "";
    const imageUpdatePanel = canUpdateImage
      ? `
        <section class="ocsp-card p-3 mb-4" id="${imageUpdatePanelId}" hidden>
          <h3 class="content-label mb-2">Update issue image</h3>
          <p class="small text-muted mb-3">Add or replace the public image URL while this issue is Open or In Progress.</p>
          <form data-action="update-issue-image" data-issue-id="${issueDomId}">
            <label class="form-label" for="${imageUpdateInputId}">Image URL</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-image" aria-hidden="true"></i></span>
              <input class="form-control" id="${imageUpdateInputId}" name="imageUrl" type="url" inputmode="url" maxlength="300" autocomplete="url" spellcheck="false" required value="${escapeHtml(ui.editableImageUrl || "")}" placeholder="https://example.com/issue-photo.jpg" aria-describedby="${imageUpdateHelpId} ${imageUpdateStatusId}">
            </div>
            <p class="small text-muted mt-2 mb-3" id="${imageUpdateHelpId}">Use a public address beginning with http:// or https://.</p>
            <p class="small mb-3" id="${imageUpdateStatusId}" data-image-update-status role="status" aria-live="polite"></p>
            <div class="d-flex flex-wrap justify-content-end gap-2">
              <button class="ocsp-button ocsp-button--cancel" type="button" data-action="cancel-issue-image-update">Cancel</button>
              <button class="ocsp-button ocsp-button--submit" type="submit"><i class="bi bi-check2-circle" aria-hidden="true"></i>Save image</button>
            </div>
          </form>
        </section>`
      : "";
    const warningAlert = warnings.length
      ? `
        <div class="alert alert-warning mb-4" role="alert">
          Some issue details could not be loaded: ${warnings.map(escapeHtml).join(", ")}.
        </div>`
      : "";

    return `
      <div class="modal fade issue-detail-modal" id="citizenIssueDetails-${issueDomId}" tabindex="-1" aria-labelledby="citizenIssueDetailsTitle-${issueDomId}" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl modal-fullscreen-sm-down issue-detail-dialog">
          <div class="modal-content issue-detail-modal__content">
            <div class="modal-header issue-dialog__header issue-detail-modal__header">
              <div>
                <span class="page-kicker">Citizen issue</span>
                <h2 class="modal-title" id="citizenIssueDetailsTitle-${issueDomId}">${escapeHtml(issue.title)}</h2>
              </div>
              <div class="d-flex align-items-center gap-2">
                ${imageUpdateAction}
                <button type="button" class="dialog-close border-0 bg-transparent" data-bs-dismiss="modal" aria-label="Close issue details">
                  <i class="bi bi-x-lg" aria-hidden="true"></i>
                </button>
              </div>
            </div>
            <div class="modal-body issue-body issue-detail-modal__body">
              ${renderStatusBanner(issue)}
              ${warningAlert}
              ${imageUpdatePanel}
              <div class="row g-4">
                <div class="col-lg-7 pe-lg-4 border-lg-end">
                  <div class="description-block">
                    <span class="content-label">Description</span>
                    <p>${escapeHtml(issue.description)}</p>
                  </div>
                  <div class="mt-4">
                    <span class="content-label">Location</span>
                    <div class="location-value">
                      <i class="bi bi-geo-alt-fill" aria-hidden="true"></i>
                      <span>${escapeHtml(issue.location)}</span>
                    </div>
                    <div aria-label="Map placeholder showing ${escapeHtml(mapAreaName)}" class="map-preview${mapVariant}" role="img">
                      <span class="map-area-name">${escapeHtml(mapAreaName)}</span>
                      <i aria-hidden="true" class="bi bi-geo-alt-fill map-pin"></i>
                    </div>
                  </div>
                  <div class="mt-4">
                    <span class="content-label">Attachments</span>
                    ${renderAttachments(issue.attachments)}
                  </div>
                  <hr class="my-4">
                  <span class="content-label">Activity Timeline</span>
                  ${renderTimeline(issue.statusUpdates, "Detailed activity history is available to municipal staff. Your current status is shown on the issue card.")}
                </div>
                <div class="col-lg-5 ps-lg-4 comments-column">
                  <span class="content-label"><i class="bi bi-chat-text me-2" aria-hidden="true"></i>Comments</span>
                  <div aria-label="Issue updates and comments" class="comment-thread mb-3" data-comment-thread role="list">
                    ${renderComments(issue.comments)}
                  </div>
                  <form class="comment-composer" data-action="add-comment" data-issue-id="${issueDomId}">
                    <label class="visually-hidden" for="commentInput-${issueDomId}">Add a comment</label>
                    <input id="commentInput-${issueDomId}" data-comment-input class="form-control" maxlength="1000" placeholder="Add a comment..." required type="text">
                    <button aria-label="Send comment" class="ocsp-button ocsp-button--submit ocsp-button--icon" type="submit"><i class="bi bi-send" aria-hidden="true"></i></button>
                  </form>
                  <p class="small mt-2 mb-0" data-comment-status aria-live="polite"></p>
                </div>
              </div>
              ${renderRatingPanel(issue)}
            </div>
          </div>
        </div>
      </div>`;
  }

  ocsp.issueRenderers = Object.freeze({
    escapeHtml,
    safeUrl,
    safeDomId,
    getStatusMeta,
    getPriorityMeta,
    getInitials,
    formatDate,
    formatDateTime,
    renderIssueImage,
    renderIssueCard,
    renderIssueDetailModal,
    renderAttachments,
    renderComments,
    renderTimeline
  });

  global.OCSP = ocsp;
})(window);
