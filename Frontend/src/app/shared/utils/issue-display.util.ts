/** How statuses, priorities, names and status histories are shown on screen. */
import { type Issue, type StatusUpdate } from "../../core/models/issue.model";

export interface StatusMeta {
  /** CSS modifier: status-badge--open / --progress / --resolved. */
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

export function getStatusMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? { key: "neutral", label: String(status || "Unknown"), icon: "bi-question-circle" };
}

export function getPriorityMeta(priority: string): PriorityMeta {
  return PRIORITY_META[priority] ?? { key: "medium", label: String(priority || "Not set") };
}

/** "Noor Al Harthi" -> "NA". */
export function getInitials(name: string | null | undefined, fallback = "C"): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => (part[0] ?? "").toUpperCase()).join("") || fallback;
}

/** Screen readers run sentences together, so each fragment gets a full stop. */
export function asAnnouncement(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/**
 * The row that records an issue being reported rather than a status change:
 * IssueService.Create writes Open -> Open, and a synthesised entry has no
 * previous status at all.
 */
export function isSubmissionEntry(update: StatusUpdate): boolean {
  return update.newStatus === "Open" && (!update.previousStatus || update.previousStatus === "Open");
}

/**
 * The status history with the issue's own creation at the front. Issues made
 * before the backend recorded creation have no such row, so it is synthesised:
 * every issue was Open at its reportedDate.
 */
export function buildIssueTimeline(issue: Issue): StatusUpdate[] {
  const updates = Array.isArray(issue.statusUpdates) ? [...issue.statusUpdates] : [];
  if (updates.some(isSubmissionEntry) || !issue.reportedDate) {
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
