/**
 * Pure presentation for the staff and admin dashboard. Builds on the shared
 * citizen renderers rather than redefining formatting and escaping.
 */
import type { Issue, Rating, StatusUpdate } from "../models";
import type { StaffIssueDetail } from "../services/dashboard.service";
import {
  escapeHtml,
  formatDate,
  getPriorityMeta,
  getStatusMeta,
  renderAttachments,
  renderComments,
  renderIssueImage,
  renderTimeline,
  safeDomId
} from "./issue-renderers";
import { renderMapContainer } from "./map";

const STATUS_CARD_CLASS: Record<string, string> = {
  open: "open",
  progress: "inprogress",
  resolved: "resolved"
};

function statusCardClass(statusKey: string): string {
  return STATUS_CARD_CLASS[statusKey] ?? "open";
}

export function renderStaffIssueCard(issue: Issue): string {
  const status = getStatusMeta(issue.currentStatus);
  const priority = getPriorityMeta(issue.priority);
  const issueDomId = safeDomId(issue.issueId);
  const department = issue.assignedDepartmentName || "Awaiting assignment";
  const category = issue.categoryName || "Uncategorized";
  const region = issue.regionName || "Region unavailable";

  return `
      <div class="accordion-item issue-card issue-${statusCardClass(status.key)} issue-filter-item issue-filter-item--${status.key}" data-issue-id="${issueDomId}">
        <div class="accordion-header">
          <a
            class="accordion-button collapsed"
            id="staffIssueTrigger-${issueDomId}"
            href="#issueModal-${issueDomId}"
            data-action="open-issue"
            data-issue-id="${issueDomId}"
            aria-haspopup="dialog"
            aria-controls="issueModal-${issueDomId}">
            <div class="row align-items-center w-100 me-2 g-2 text-start">
              <div class="col-12 col-md-3 d-flex align-items-center gap-3">
                ${renderIssueImage(issue)}
                <div class="min-w-0">
                  <h3 class="issue-title mb-0 fw-bold text-dark text-truncate">${escapeHtml(issue.title)}</h3>
                  <small class="text-muted">REQ-${escapeHtml(issue.issueId)}</small>
                </div>
              </div>
              <div class="col-6 col-md-2 text-dark small">
                User ID: ${escapeHtml(issue.reportedById || "Unavailable")}
              </div>
              <div class="col-12 col-md-3 text-muted small">
                <span class="fw-semibold text-dark">${escapeHtml(department)}</span><br>
                <span class="text-secondary">${escapeHtml(category)} &bull; ${escapeHtml(region)}</span>
              </div>
              <div class="col-6 col-md-2 text-md-center d-flex justify-content-md-center gap-2 flex-wrap status-priority-group">
                <span class="status-badge status-badge--${status.key}">${escapeHtml(status.label)}</span>
                <span class="priority-badge priority-badge--${priority.key}">${escapeHtml(priority.label)}</span>
              </div>
              <time class="col-12 col-md-2 text-md-end text-muted issue-date" datetime="${escapeHtml(issue.reportedDate || "")}">
                ${escapeHtml(formatDate(issue.reportedDate))}
              </time>
            </div>
          </a>
        </div>
      </div>`;
}

function renderStaffRatingPanel(rating: Rating | null): string {
  if (!rating) {
    return `
        <div class="rating-panel">
          <span class="fw-bold small text-dark">Citizen Feedback &amp; Rating</span>
          <p class="mb-0 mt-2 small text-muted">The citizen has not submitted feedback yet.</p>
        </div>`;
  }

  const score = Math.max(1, Math.min(5, Number(rating.score) || 0));
  const stars = [1, 2, 3, 4, 5]
    .map(
      (value) =>
        `<i class="bi ${value <= score ? "bi-star-fill" : "bi-star"}" aria-hidden="true"></i>`
    )
    .join("");
  const feedback = rating.feedback
    ? `<p class="mb-0 small text-muted">&ldquo;${escapeHtml(rating.feedback)}&rdquo;</p>`
    : '<p class="mb-0 small text-muted">No written feedback was provided.</p>';

  return `
      <div class="rating-panel">
        <div class="d-flex align-items-center justify-content-between gap-3 mb-2">
          <span class="fw-bold small text-dark">Citizen Feedback &amp; Rating</span>
          <span class="text-warning small" aria-label="${score} out of 5 stars">
            ${stars}
            <span class="fw-bold text-dark ms-1">${score}.0 / 5</span>
          </span>
        </div>
        ${feedback}
      </div>`;
}

function renderStaffActionPanel(issue: StaffIssueDetail): string {
  const issueDomId = safeDomId(issue.issueId);

  if (issue.currentStatus === "Resolved") {
    return `
        <span class="content-label">Staff Action Panel</span>
        <div class="alert alert-success bg-opacity-10 border-success-subtle text-success small mb-3">
          <i class="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
          This issue has been successfully resolved and closed.
        </div>
        ${renderStaffRatingPanel(issue.rating)}`;
  }

  // An Open issue may move to either state; InProgress can only be resolved.
  const options =
    issue.currentStatus === "Open"
      ? '<option value="InProgress">In Progress</option><option value="Resolved">Resolved</option>'
      : '<option value="Resolved">Resolved</option>';

  return `
      <span class="content-label">Staff Action Panel</span>
      <form data-action="change-status" data-issue-id="${issueDomId}">
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label small fw-bold text-dark" for="nextStatus-${issueDomId}">Next Status</label>
            <select class="form-select bg-light" id="nextStatus-${issueDomId}" name="newStatus" required>
              ${options}
            </select>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label small fw-bold text-dark" for="internalNotes-${issueDomId}">Internal Notes</label>
          <textarea class="form-control bg-light" id="internalNotes-${issueDomId}" name="notes" maxlength="500" rows="3" placeholder="Add resolution steps..."></textarea>
        </div>
        <div class="d-flex justify-content-end">
          <button type="submit" class="btn ocsp-button ocsp-button--submit staff-status-update">
            Update Status
          </button>
        </div>
        <p class="small mt-2 mb-0 text-end" data-status-action-status aria-live="polite"></p>
      </form>`;
}

function renderCompactTimeline(statusUpdates: StatusUpdate[]): string {
  return renderTimeline(statusUpdates).replace(
    'class="activity-timeline"',
    'class="activity-timeline activity-timeline--compact"'
  );
}

export function renderStaffIssueDetailModal(issue: StaffIssueDetail): string {
  const issueDomId = safeDomId(issue.issueId);
  const mapName = issue.regionName || "Issue location";
  const latitude = issue.latitude === null ? NaN : Number(issue.latitude);
  const longitude = issue.longitude === null ? NaN : Number(issue.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  // Staff dispatch crews from this, so the exact numbers stay on screen next to
  // the map rather than only being implied by the pin.
  const coordinateCopy = hasCoordinates
    ? `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`
    : "Coordinates unavailable";
  const warnings = Array.isArray(issue.warnings) ? issue.warnings : [];
  const warningAlert = warnings.length
    ? `
        <div class="alert alert-warning small mb-4" role="alert">
          <strong>Some supporting details are unavailable:</strong>
          ${warnings.map(escapeHtml).join(", ")}.
        </div>`
    : "";

  return `
      <div class="modal issue-detail-modal" id="issueModal-${issueDomId}" tabindex="-1" aria-labelledby="issueModalLabel-${issueDomId}" role="dialog" aria-modal="true">
        <a class="ocsp-target-backdrop ocsp-target-backdrop--modal" href="#staffIssueTrigger-${issueDomId}" data-action="close-issue" aria-label="Close issue details" tabindex="-1"></a>
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down issue-detail-dialog">
          <div class="modal-content issue-detail-modal__content">
            <div class="modal-header issue-dialog__header issue-detail-modal__header">
              <div>
                <span class="content-label">STAFF ISSUE &middot; REQ-${escapeHtml(issue.issueId)}</span>
                <h2 class="modal-title" id="issueModalLabel-${issueDomId}">${escapeHtml(issue.title)}</h2>
              </div>
              <a class="btn-close" href="#staffIssueTrigger-${issueDomId}" data-action="close-issue" aria-label="Close issue details"></a>
            </div>
            <div class="modal-body issue-detail-modal__body bg-white p-4">
              ${warningAlert}
              <div class="row">
                <div class="col-md-7 pe-md-4 border-end">
                  <p class="mb-2"><strong>Description:</strong> ${escapeHtml(issue.description)}</p>
                  <p class="mb-3 text-muted small">
                    <i class="bi bi-geo-alt-fill me-1" aria-hidden="true"></i>
                    ${escapeHtml(issue.location)}
                  </p>
                  <div class="mb-4">
                    ${renderMapContainer({
                      latitude: hasCoordinates ? latitude : null,
                      longitude: hasCoordinates ? longitude : null,
                      label: mapName,
                      height: "240px"
                    })}
                    <p class="text-muted small mt-2 mb-0">
                      <i class="bi bi-pin-map me-1" aria-hidden="true"></i>${escapeHtml(coordinateCopy)}
                    </p>
                  </div>
                  <div class="attachments-section">
                    <span class="content-label"><i class="bi bi-paperclip me-1" aria-hidden="true"></i>Citizen Attachments</span>
                    ${renderAttachments(issue.attachments)}
                  </div>
                  <div class="mt-4">
                    <span class="content-label">Activity Timeline</span>
                    ${renderCompactTimeline(issue.statusUpdates)}
                  </div>
                  <hr class="my-4">
                  ${renderStaffActionPanel(issue)}
                </div>
                <div class="col-md-5 ps-md-4 comments-column">
                  <span class="content-label"><i class="bi bi-chat-text me-2" aria-hidden="true"></i>Comments</span>
                  <div class="comment-thread mb-3" data-comment-thread aria-label="Issue updates and comments" role="list">
                    ${renderComments(issue.comments)}
                  </div>
                  <form class="comment-composer" data-action="add-staff-comment" data-issue-id="${issueDomId}">
                    <label class="visually-hidden" for="staffComment-${issueDomId}">Add a public comment</label>
                    <input class="form-control" id="staffComment-${issueDomId}" name="content" data-comment-input maxlength="1000" placeholder="Add a public comment..." required type="text">
                    <button class="btn ocsp-button ocsp-button--submit ocsp-button--icon" type="submit" aria-label="Send comment">
                      <i class="bi bi-send" aria-hidden="true"></i>
                    </button>
                  </form>
                  <p class="small mt-2 mb-0" data-comment-status aria-live="polite"></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
}
