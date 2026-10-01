import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { type Observable, forkJoin, map, switchMap, throwError } from "rxjs";
import { apiEndpoints } from "../../core/api/api-endpoints";
import { resolveApiAssetUrl } from "../../core/api/api-asset-url.util";
import { SessionService } from "../../core/auth/session.service";
import { APP_CONFIG } from "../../core/config/app-config.token";
import { type Attachment } from "../../core/models/attachment.model";
import { type Comment } from "../../core/models/comment.model";
import { type ChangeIssueStatusRequest, type Issue, type IssueDetail, type StatusUpdate } from "../../core/models/issue.model";
import {
  type Category, type CategoryRequest, type Department, type DepartmentRequest, type Region, type RegionRequest
} from "../../core/models/lookup.model";
import { type Notification } from "../../core/models/notification.model";
import { type Rating } from "../../core/models/rating.model";
import { asArray, failedSections, optionalRequest } from "../../core/utils/optional-requests.util";
import { isRecord } from "../../core/utils/text-coercion.util";

/** Everything the staff dashboard needs on load. */
export interface StaffDashboardData {
  issues: Issue[];
  categories: Category[];
  regions: Region[];
  departments: Department[];
  notifications: Notification[];
  statusUpdates: StatusUpdate[];
  /** Optional sections that failed, e.g. ["departments"]. */
  warnings: string[];
}

/** An issue in full for staff: every rating on it, not just the reporter's. */
export interface StaffIssueDetail extends IssueDetail {
  ratings: Rating[];
}

/**
 * Staff and Admin: every issue, status changes, staff comments, and (Admin
 * only) creating regions, departments and categories. Loading degrades
 * rather than fails, like the citizen service.
 */
@Injectable({ providedIn: "root" })
export class StaffDashboardService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly apiBaseUrl = inject(APP_CONFIG).apiBaseUrl;

  loadDashboard(): Observable<StaffDashboardData> {
    return forkJoin({
      issues: this.list<Issue>(apiEndpoints.allIssues),
      categories: optionalRequest(this.list<Category>(apiEndpoints.categories), []),
      regions: optionalRequest(this.list<Region>(apiEndpoints.regions), []),
      departments: optionalRequest(this.list<Department>(apiEndpoints.departments), []),
      notifications: optionalRequest(this.list<Notification>(apiEndpoints.myNotifications), []),
      statusUpdates: optionalRequest(this.list<StatusUpdate>(apiEndpoints.allStatusUpdates), [])
    }).pipe(map(({ issues, categories, regions, departments, notifications, statusUpdates }) => ({
      issues: issues.map((issue) => normalizeIssue(issue)),
      categories: categories.value,
      regions: regions.value,
      departments: departments.value,
      notifications: notifications.value,
      statusUpdates: statusUpdates.value,
      warnings: failedSections({ categories, regions, departments, notifications, "status history": statusUpdates })
    })));
  }

  /** Issue LIST entries carry no attachments, so card photos are fetched per issue. */
  getAttachments(issueId: number): Observable<Attachment[]> {
    return this.list<Attachment>(apiEndpoints.attachmentsByIssue(issueId)).pipe(map((attachments) =>
      attachments.map((attachment) => ({
        ...attachment,
        fileUrl: resolveApiAssetUrl(attachment.fileUrl, this.apiBaseUrl),
        label: `Attachment ${attachment.attachmentId || ""}`.trim(),
        style: "document"
      }))));
  }

  getIssueDetails(issueId: number): Observable<StaffIssueDetail> {
    return this.http.get<Issue>(apiEndpoints.issueById(issueId)).pipe(
      switchMap((raw) => forkJoin({
        comments: optionalRequest(this.list<Comment>(apiEndpoints.commentsByIssue(issueId)), []),
        attachments: optionalRequest(this.getAttachments(issueId), []),
        history: optionalRequest(this.list<StatusUpdate>(apiEndpoints.statusUpdatesByIssue(issueId)), []),
        ratings: optionalRequest(this.list<Rating>(apiEndpoints.ratingsByIssue(issueId)), [])
      }).pipe(map(({ comments, attachments, history, ratings }) => {
        const issue = normalizeIssue(raw);
        // Newest first, so the reporter's most recent feedback wins.
        const sortedRatings = [...ratings.value].sort((left, right) => byDate(right.ratedAt, left.ratedAt));
        return {
          ...issue,
          comments: comments.value,
          attachments: attachments.value,
          statusUpdates: [...history.value].sort((left, right) => byDate(left.updatedAt, right.updatedAt)),
          ratings: sortedRatings,
          rating: sortedRatings.find((rating) => Number(rating.userId) === Number(issue.reportedById)) ?? null,
          warnings: failedSections({ comments, attachments, "activity timeline": history, ratings })
        };
      })))
    );
  }

  /** The API answers with the new status-history row. */
  changeStatus(issueId: number, payload: ChangeIssueStatusRequest): Observable<Partial<StatusUpdate> | null> {
    const body: ChangeIssueStatusRequest = { newStatus: payload.newStatus, notes: String(payload.notes ?? "").trim() || null };
    return this.http.put<Partial<StatusUpdate> | null>(apiEndpoints.changeIssueStatus(issueId), body);
  }

  addComment(issueId: number, content: string): Observable<Comment> {
    return this.http.post<Comment>(apiEndpoints.createComment, { issueId, content: content.trim() });
  }

  createRegion(payload: RegionRequest): Observable<Region> {
    return this.asAdmin(() => this.http.post<Region>(apiEndpoints.createRegion, payload));
  }

  createDepartment(payload: DepartmentRequest): Observable<Department> {
    return this.asAdmin(() => this.http.post<Department>(apiEndpoints.createDepartment, payload));
  }

  createCategory(payload: CategoryRequest): Observable<Category> {
    return this.asAdmin(() => this.http.post<Category>(apiEndpoints.createCategory, payload));
  }

  /** A UI guard, not the security boundary: the API enforces Admin too. */
  private asAdmin<T>(request: () => Observable<T>): Observable<T> {
    return this.session.getUser()?.role === "Admin"
      ? request()
      : throwError(() => new Error("Only an Admin can change platform setup."));
  }

  /** The API answers 204 (null) for an empty list. */
  private list<T>(url: string): Observable<T[]> {
    return this.http.get<T[] | null>(url).pipe(map((value) => asArray<T>(value)));
  }
}

function normalizeIssue(issue: unknown): Issue {
  const value = (isRecord(issue) ? issue : {}) as Partial<Issue>;
  return {
    ...(value as Issue),
    attachments: asArray<Attachment>(value.attachments),
    comments: asArray<Comment>(value.comments),
    statusUpdates: asArray<StatusUpdate>(value.statusUpdates),
    rating: value.rating ?? null,
    ui: { imageStyle: "document", previewLabel: "Issue attachment", mapAreaName: value.regionName || "Issue location", hasFreshUpdate: false }
  };
}

function byDate(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}
