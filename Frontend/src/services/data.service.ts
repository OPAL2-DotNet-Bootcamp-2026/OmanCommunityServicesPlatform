/**
 * Member 3 - convert from scripts/services/data-service.js (170 lines).
 *
 * The citizen-facing read layer. Its defining trait is that it degrades rather
 * than fails: getDashboardData awaits the issues, then uses Promise.allSettled
 * for the lookups so a categories outage does not hide the user's issues. The
 * names of the failed sections come back in warnings[] and the page shows them.
 *
 * Typing notes:
 *   - Promise.allSettled gives PromiseSettledResult<T>, a discriminated union
 *     on .status. Narrow on it; do not cast. The settledValue helper at
 *     data-service.js:20 is where that narrowing belongs.
 *   - normalizeIssue (:39) fills categoryId and regionId by matching names
 *     against the lookup lists, which is why those fields are nullable on the
 *     Issue model.
 *   - statusUpdates is hard-coded to [] on this path (:52). The backend
 *     restricts status history to Staff and Admin. Keep the comment explaining
 *     why - it looks like a bug otherwise.
 */
import type { ApiClient } from "../core/api-client";
import type {
  Category,
  CreateIssueRequest,
  Issue,
  IssueDetail,
  Notification,
  Rating,
  Region,
  Comment
} from "../models";
import type { SessionService, SessionUser } from "./session.service";

/** What the citizen dashboard needs in one call. data-service.js:81 */
export interface CitizenDashboardData {
  currentUser: SessionUser | null;
  notifications: Notification[];
  categories: Category[];
  regions: Region[];
  issues: Issue[];
  /** Names of the sections whose requests failed, e.g. ["categories"]. */
  warnings: string[];
}

export class DataService {
  constructor(
    protected readonly api: ApiClient,
    protected readonly session: SessionService
  ) {}

  getNotifications(): Promise<Notification[]> {
    throw new Error("DataService.getNotifications - Member 3, from data-service.js:60");
  }

  getUnreadNotifications(): Promise<Notification[]> {
    throw new Error("DataService.getUnreadNotifications - Member 3, from data-service.js:64");
  }

  markNotificationAsRead(_notificationId: number): Promise<boolean> {
    throw new Error("DataService.markNotificationAsRead - Member 3, from data-service.js:68");
  }

  updateNotificationReadStatus(_notificationId: number, _isRead: boolean): Promise<boolean> {
    throw new Error("DataService.updateNotificationReadStatus - Member 3, data-service.js:73");
  }

  getDashboardData(): Promise<CitizenDashboardData> {
    throw new Error("DataService.getDashboardData - Member 3, from data-service.js:81");
  }

  getIssueDetails(_issueId: number): Promise<IssueDetail> {
    throw new Error("DataService.getIssueDetails - Member 3, from data-service.js:104");
  }

  createIssue(_payload: CreateIssueRequest): Promise<Issue> {
    throw new Error("DataService.createIssue - Member 3, from data-service.js:129");
  }

  addComment(_issueId: number, _content: string): Promise<Comment> {
    throw new Error("DataService.addComment - Member 3, from data-service.js:138");
  }

  /** ratingId null means create, otherwise update. data-service.js:145 */
  saveRating(
    _ratingId: number | null,
    _issueId: number,
    _score: number,
    _feedback: string | null
  ): Promise<Rating> {
    throw new Error("DataService.saveRating - Member 3, from data-service.js:145");
  }
}
