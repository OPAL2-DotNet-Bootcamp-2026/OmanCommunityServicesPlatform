/**
 * Member 4 - convert from scripts/components/dashboard-renderers.js (224 lines).
 *
 * Blocked on Member 3's issue-renderers PR, which this one builds on: the
 * staff card reuses escapeHtml, getStatusMeta, formatDate and friends rather
 * than redefining them. Do dashboard.service.ts while you wait.
 *
 * Only two functions are exported. The other four in the JavaScript
 * (statusCardClass, renderStaffRatingPanel, renderStaffActionPanel,
 * renderCompactTimeline) are private helpers - keep them module-private here
 * rather than exporting them, so the public surface stays two functions wide.
 *
 * Same purity rule as issue-renderers: data in, HTML string out.
 */
import type { IssueDetail, Issue } from "../models";

export function renderStaffIssueCard(_issue: Issue): string {
  throw new Error("renderStaffIssueCard - Member 4, from dashboard-renderers.js:15");
}

export function renderStaffIssueDetailModal(_issue: IssueDetail): string {
  throw new Error("renderStaffIssueDetailModal - Member 4, from dashboard-renderers.js:140");
}
