/**
 * Pure presentation for citizen-facing issues: data in, HTML string out.
 *
 * Nothing here fetches or touches the live document, which is what lets each of
 * these become an Angular @Component later with the returned string as its
 * template and the arguments as @Input()s.
 */
import { config } from "../core/config";
import type { Attachment, Comment, Issue, IssueDetail, StatusUpdate } from "../models";
import { resolveIssueImage } from "./issue-media";
import { renderMapContainer } from "./map";
import { asText } from "../text";

export interface StatusMeta {
  key: string;
  label: string;
  icon: string;
}

export interface PriorityMeta {
  key: string;
  label: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  Open: { key: "open", label: "Open", icon: "bi-inbox" },
  InProgress: { key: "progress", label: "In Progress", icon: "bi-hourglass-split" },
  Resolved: { key: "resolved", label: "Resolved", icon: "bi-check-circle" }
};

const PRIORITY_META: Record<string, PriorityMeta> = {
  Low: { key: "low", label: "Low" },
  Medium: { key: "medium", label: "Medium" },
  High: { key: "high", label: "High" }
};

const ATTACHMENT_STYLES = ["road", "water", "night", "fixed", "document"];

/** Takes unknown because it is called on raw API values, which may be anything. */
export function escapeHtml(value: unknown): string {
  return asText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Returns "" for anything that is not a relative path or an http(s) URL. */
export function safeUrl(value: unknown): string {
  const candidate = asText(value).trim();
  if (!candidate) {
    return "";
  }

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(candidate);
  if (!hasScheme && !candidate.startsWith("//")) {
    return candidate;
  }

  try {
    const parsed = new URL(candidate, document.baseURI);
    return ["http:", "https:"].includes(parsed.protocol) ? candidate : "";
  } catch {
    return "";
  }
}

export function safeDomId(value: unknown): string {
  return asText(value).replace(/[^a-zA-Z0-9_-]/g, "-") || "unknown";
}

export function getStatusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] ?? {
      key: "neutral",
      label: String(status || "Unknown"),
      icon: "bi-question-circle"
    }
  );
}

export function getPriorityMeta(priority: string): PriorityMeta {
  return PRIORITY_META[priority] ?? { key: "medium", label: String(priority || "Not set") };
}

export function getInitials(name: string | null | undefined): string {
  const parts = String(name || "Citizen")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => (part[0] ?? "").toUpperCase()).join("") || "C";
}

export function formatDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) {
    return "Latest status";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  const formatOptions = options ?? { day: "numeric", month: "short", year: "numeric" };

  try {
    return new Intl.DateTimeFormat(config.locale, {
      ...formatOptions,
      timeZone: config.timeZone
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function renderIssueImage(issue: Issue): string {
  const image = resolveIssueImage(issue);

  if (!image) {
    return `
        <span class="issue-card-media issue-card-media--attachment issue-card-media--document" data-preview-label="No preview" aria-hidden="true">
          <i class="bi bi-image"></i>
        </span>`;
  }

  return `
      <span class="issue-card-media issue-card-media--attachment issue-card-media--${image.style}" data-preview-label="${escapeHtml(image.previewLabel)}" role="img" aria-label="${escapeHtml(image.alt)}">
        <img class="issue-card-media__image" src="${escapeHtml(image.url)}" alt="" width="720" height="480" loading="lazy" decoding="async">
      </span>`;
}

export function renderIssueCard(issue: Issue): string {
  const status = getStatusMeta(issue.currentStatus);
  const priority = getPriorityMeta(issue.priority);
  const issueDomId = safeDomId(issue.issueId);
  const hasFreshUpdate = Boolean(issue.ui?.hasFreshUpdate);

  return `
      <article class="ocsp-card ocsp-card--interactive issue-card issue-card--${status.key} issue-filter-item issue-filter-item--${status.key}${hasFreshUpdate ? " is-updated" : ""}" data-issue-id="${issueDomId}">
        <button
          class="citizen-row-summary issue-card-preview issue-card-trigger"
          type="button"
          data-action="open-issue"
          data-issue-id="${issueDomId}"
          aria-haspopup="dialog"
          aria-label="View details for ${escapeHtml(issue.title)}${hasFreshUpdate ? ". New update." : ""}">
          <span class="row align-items-center w-100 g-2 text-start">
            <span class="col-auto">${renderIssueImage(issue)}</span>
            <span class="col">
              <span class="issue-title-row">
                <span class="issue-title d-block">${escapeHtml(issue.title)}</span>
                ${hasFreshUpdate ? '<span class="fresh-update"><i class="bi bi-stars" aria-hidden="true"></i> New update</span>' : ""}
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

export function renderAttachments(attachments: Attachment[]): string {
  if (!Array.isArray(attachments) || !attachments.length) {
    return '<p class="text-muted small mb-0">No attachments were added to this issue.</p>';
  }

  const items = attachments
    .map((attachment) => {
      const fileUrl = safeUrl(attachment.fileUrl);
      const style = ATTACHMENT_STYLES.includes(attachment.style ?? "")
        ? (attachment.style as string)
        : "document";
      const label = attachment.label || attachment.fileName || "Attachment";
      const icon = attachment.fileType === "Image" ? "bi-image" : "bi-file-earmark";
      const content = `
              <i class="bi ${icon}" aria-hidden="true"></i>
              <span>${escapeHtml(label)}</span>`;

      if (!fileUrl) {
        return `<span class="attachment-thumb attachment-thumb--${style}">${content}</span>`;
      }

      return `
              <a class="attachment-thumb attachment-thumb--${style}" href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(label)}">
                ${content}
              </a>`;
    })
    .join("");

  return `
      <div class="attachment-grid">
        ${items}
      </div>`;
}

/**
 * True for the row that records an issue being reported, rather than a
 * transition between states.
 *
 * Two shapes count. IssueService.Create writes Open -> Open, because
 * previousStatus is a required non-nullable enum and there is no "none" member.
 * A synthesised entry has no previousStatus at all, which covers issues created
 * before the backend started writing the row.
 */
export function isSubmissionEntry(update: StatusUpdate): boolean {
  return update.newStatus === "Open" && (!update.previousStatus || update.previousStatus === "Open");
}

/**
 * The status history with the issue's own creation at the front.
 *
 * The backend records creation now, but issues created before that change have
 * no such row, and their Open period would otherwise be invisible - the history
 * would begin at the first status CHANGE. Every issue was Open at reportedDate
 * by definition, so the entry is synthesised when it is missing.
 */
export function buildTimeline(issue: Issue): StatusUpdate[] {
  const updates = Array.isArray(issue.statusUpdates) ? [...issue.statusUpdates] : [];

  const alreadyHasSubmission = updates.some(isSubmissionEntry);
  if (alreadyHasSubmission || !issue.reportedDate) {
    return updates;
  }

  const submission: StatusUpdate = {
    statusUpdateId: 0,
    issueId: issue.issueId,
    updatedById: issue.reportedById,
    previousStatus: "" as StatusUpdate["previousStatus"],
    newStatus: "Open",
    notes: null,
    updatedAt: issue.reportedDate
  };

  return [submission, ...updates].sort(
    (left, right) => new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
  );
}

export function renderTimeline(statusUpdates: StatusUpdate[], emptyMessage?: string): string {
  if (!Array.isArray(statusUpdates) || !statusUpdates.length) {
    return `<p class="text-muted small mb-0">${escapeHtml(emptyMessage || "No status updates are available.")}</p>`;
  }

  const items = statusUpdates
    .map((update) => {
      const status = getStatusMeta(update.newStatus);
      const isSubmission = isSubmissionEntry(update);
      const label = isSubmission ? "Issue Submitted" : status.label;
      const notes = String(update.notes ?? "").trim();
      const staffLine =
        !isSubmission && update.updatedById
          ? `<small>Changed by Staff ID: ${escapeHtml(update.updatedById)}</small>`
          : "";
      const notesLine =
        !isSubmission && notes && notes !== label ? `<small>${escapeHtml(notes)}</small>` : "";

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
    .join("");

  return `
      <ol class="activity-timeline">
        ${items}
      </ol>`;
}

export function renderComments(comments: Comment[]): string {
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

/* ------------------------------------------------------------------
   Shared detail blocks.

   The citizen and staff modals used to build these independently, with
   different markup and different classes, so the same issue looked like two
   different products. They compose the same functions now.
   ------------------------------------------------------------------ */

export function renderDescriptionBlock(issue: Issue): string {
  return `
      <div class="description-block">
        <span class="content-label">Description</span>
        <p>${escapeHtml(issue.description)}</p>
      </div>`;
}

export interface LocationBlockOptions {
  /** Staff dispatch crews from the numbers, so they stay on screen there. */
  showCoordinates?: boolean;
  mapHeight?: string;
}

export function renderLocationBlock(issue: Issue, options: LocationBlockOptions = {}): string {
  const mapAreaName = issue.ui?.mapAreaName || issue.regionName || "Issue location";
  const latitude = issue.latitude === null ? null : Number(issue.latitude);
  const longitude = issue.longitude === null ? null : Number(issue.longitude);
  const hasCoordinates =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const coordinateLine =
    options.showCoordinates && hasCoordinates
      ? `
        <p class="text-muted small mt-2 mb-0">
          <i class="bi bi-pin-map me-1" aria-hidden="true"></i>Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}
        </p>`
      : "";

  return `
      <div class="mt-4">
        <span class="content-label">Location</span>
        <div class="location-value">
          <i class="bi bi-geo-alt-fill" aria-hidden="true"></i>
          <span>${escapeHtml(issue.location)}</span>
        </div>
        ${renderMapContainer({
          latitude: hasCoordinates ? latitude : null,
          longitude: hasCoordinates ? longitude : null,
          label: mapAreaName,
          height: options.mapHeight
        })}
        ${coordinateLine}
      </div>`;
}

export interface AttachmentsBlockOptions {
  label?: string;
  /** Renders the citizen's "add a link" form under the grid. */
  allowAdd?: boolean;
  issueDomId?: string;
}

export function renderAttachmentsBlock(
  issue: Issue,
  options: AttachmentsBlockOptions = {}
): string {
  const label = options.label ?? "Attachments";
  const addForm = options.allowAdd ? renderAddAttachmentForm(options.issueDomId ?? "") : "";

  return `
      <div class="mt-4">
        <span class="content-label"><i class="bi bi-paperclip me-1" aria-hidden="true"></i>${escapeHtml(label)}</span>
        <div data-attachment-grid>
          ${renderAttachments(issue.attachments)}
        </div>
        ${addForm}
      </div>`;
}

/**
 * The backend stores a URL, not a file - there is no upload endpoint - so this
 * takes a link. POST /attachment/Create is Citizen-only, which is why the form
 * appears on the citizen modal and not the staff one.
 */
function renderAddAttachmentForm(issueDomId: string): string {
  return `
        <form class="attachment-composer mt-3" data-action="add-attachment" data-issue-id="${issueDomId}">
          <label class="form-label small fw-semibold mb-1" for="attachmentUrl-${issueDomId}">
            Add an attachment link
          </label>
          <div class="attachment-composer__row">
            <input
              class="form-control"
              id="attachmentUrl-${issueDomId}"
              name="fileUrl"
              type="url"
              inputmode="url"
              maxlength="500"
              placeholder="https://example.com/photo.jpg"
              required>
            <label class="visually-hidden" for="attachmentType-${issueDomId}">Attachment type</label>
            <select class="form-select" id="attachmentType-${issueDomId}" name="fileType">
              <option value="Image" selected>Image</option>
              <option value="Document">Document</option>
            </select>
            <button class="ocsp-button ocsp-button--submit" type="submit">
              <i class="bi bi-plus-lg" aria-hidden="true"></i> Add
            </button>
          </div>
          <p class="form-text mb-0">
            Paste a link to a photo or document that is already online.
          </p>
          <p class="small mt-2 mb-0" data-attachment-status aria-live="polite"></p>
        </form>`;
}

export interface TimelineBlockOptions {
  compact?: boolean;
  /** Shown under the timeline when the backend withheld the detail. */
  note?: string;
}

export function renderTimelineBlock(issue: Issue, options: TimelineBlockOptions = {}): string {
  const entries = buildTimeline(issue);
  const timeline = renderTimeline(entries, "No status updates are available.");
  const body = options.compact
    ? timeline.replace(
        'class="activity-timeline"',
        'class="activity-timeline activity-timeline--compact"'
      )
    : timeline;
  const note = options.note
    ? `<p class="text-muted small mt-2 mb-0">${escapeHtml(options.note)}</p>`
    : "";

  return `
      <div class="mt-4">
        <span class="content-label">Activity Timeline</span>
        ${body}
        ${note}
      </div>`;
}

/** Only shown once an issue is Resolved - there is nothing to rate before that. */
function renderRatingPanel(issue: IssueDetail): string {
  if (issue.currentStatus !== "Resolved") {
    return "";
  }

  const selectedScore = Number(issue.rating?.score) || 0;
  const feedback = issue.rating?.feedback ?? "";
  const ratingId = Number(issue.rating?.ratingId) || "";
  const issueDomId = safeDomId(issue.issueId);

  const stars = [1, 2, 3, 4, 5]
    .map(
      (score) => `
                <button aria-label="Rate ${score} out of 5" aria-pressed="${score === selectedScore}" data-action="select-rating" data-score="${score}" type="button">
                  <i class="bi ${score <= selectedScore ? "bi-star-fill" : "bi-star"}" aria-hidden="true"></i>
                </button>`
    )
    .join("");

  return `
      <div class="ocsp-card rating-panel" data-rating-panel data-issue-id="${issueDomId}" data-rating-id="${ratingId}" data-selected-rating="${selectedScore}">
        <div class="rating-copy">
          <h3>Rate this service</h3>
          <p>How satisfied are you with the resolution of this issue?</p>
        </div>
        <div aria-label="Service rating" class="rating-stars" role="group">
          ${stars}
        </div>
        <label class="visually-hidden" for="citizenFeedback-${issueDomId}">Optional service feedback</label>
        <textarea class="form-control" id="citizenFeedback-${issueDomId}" data-rating-feedback maxlength="500" placeholder="Leave optional feedback..." rows="3">${escapeHtml(feedback)}</textarea>
        <button class="ocsp-button ocsp-button--submit mt-3" data-action="submit-rating" type="button">
          <i class="bi bi-send-fill" aria-hidden="true"></i>
          ${ratingId ? "Update Feedback" : "Submit Feedback"}
        </button>
        <p class="small mt-2 mb-0" data-rating-status aria-live="polite"></p>
      </div>`;
}

function renderStatusBanner(issue: IssueDetail): string {
  const ui = issue.ui ?? {};
  if (!ui.hasFreshUpdate || !ui.updateTitle) {
    return "";
  }

  const status = getStatusMeta(issue.currentStatus);
  const isResolved = status.key === "resolved";
  return `
      <div class="status-change-banner${isResolved ? " status-change-banner--resolved" : ""}">
        <i class="bi ${isResolved ? "bi-check-circle-fill" : "bi-arrow-repeat"}" aria-hidden="true"></i>
        <div>
          <strong>${escapeHtml(ui.updateTitle)}</strong>
          <span>${escapeHtml(ui.updateMessage || "The issue has a new municipal update.")}</span>
        </div>
      </div>`;
}

export function renderIssueDetailModal(issue: IssueDetail): string {
  const issueDomId = safeDomId(issue.issueId);
  const warnings = Array.isArray(issue.warnings) ? issue.warnings : [];
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
              <button type="button" class="dialog-close border-0 bg-transparent" data-bs-dismiss="modal" aria-label="Close issue details">
                <i class="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
            <div class="modal-body issue-body issue-detail-modal__body">
              ${renderStatusBanner(issue)}
              ${warningAlert}
              <div class="row g-4">
                <div class="col-lg-7 pe-lg-4 issue-detail-divider">
                  ${renderDescriptionBlock(issue)}
                  ${renderLocationBlock(issue)}
                  ${renderAttachmentsBlock(issue, { allowAdd: true, issueDomId })}
                  <hr class="my-4">
                  ${renderTimelineBlock(issue)}
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
