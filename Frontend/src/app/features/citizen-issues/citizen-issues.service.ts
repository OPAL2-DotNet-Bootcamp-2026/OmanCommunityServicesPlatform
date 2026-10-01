import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { type Observable, catchError, firstValueFrom, forkJoin, map, of, switchMap, throwError } from "rxjs";
import { apiEndpoints } from "../../core/api/api-endpoints";
import { resolveApiAssetUrl } from "../../core/api/api-asset-url.util";
import { ApiError } from "../../core/api/api-error";
import { SessionService } from "../../core/auth/session.service";
import { APP_CONFIG } from "../../core/config/app-config.token";
import { type Attachment, type AttachmentRequest } from "../../core/models/attachment.model";
import { type Comment } from "../../core/models/comment.model";
import { type CreateIssueRequest, type Issue, type IssueDetail, type StatusUpdate } from "../../core/models/issue.model";
import { type Category, type Region } from "../../core/models/lookup.model";
import { type Notification } from "../../core/models/notification.model";
import { type Rating } from "../../core/models/rating.model";
import { parseApiDate } from "../../core/utils/api-date.util";
import { asArray, failedSections, optionalRequest } from "../../core/utils/optional-requests.util";
import { isRecord } from "../../core/utils/text-coercion.util";

/** Everything the My Issues page needs on load. */
export interface CitizenIssuesData {
  issues: Issue[];
  categories: Category[];
  regions: Region[];
  notifications: Notification[];
  /** Optional sections that failed to load, e.g. ["categories"]. */
  warnings: string[];
}

/**
 * The citizen's issues and everything attached to them. Loading degrades
 * rather than fails: the issue list is essential, the lookups around it only
 * produce warnings.
 */
@Injectable({ providedIn: "root" })
export class CitizenIssuesService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly apiBaseUrl = inject(APP_CONFIG).apiBaseUrl;

  loadMyIssues(): Observable<CitizenIssuesData> {
    return forkJoin({
      issues: this.http.get<Issue[] | null>(apiEndpoints.myIssues),
      categories: optionalRequest(this.list<Category>(apiEndpoints.categories), []),
      regions: optionalRequest(this.list<Region>(apiEndpoints.regions), []),
      notifications: optionalRequest(this.list<Notification>(apiEndpoints.myNotifications), [])
    }).pipe(
      map(({ issues, categories, regions, notifications }) => ({
        issues: markFreshUpdates(
          asArray<Issue>(issues).map((issue) => this.normalizeIssue(issue, categories.value, regions.value)),
          notifications.value
        ),
        categories: categories.value,
        regions: regions.value,
        notifications: notifications.value,
        warnings: failedSections({ categories, regions, notifications })
      }))
    );
  }

  /** Issue LIST entries carry no attachments, so card photos are fetched per issue. */
  getAttachments(issueId: number): Observable<Attachment[]> {
    return this.list<Attachment>(apiEndpoints.attachmentsByIssue(issueId)).pipe(
      map((attachments) => attachments.map((attachment) => this.normalizeAttachment(attachment)))
    );
  }

  /** The issue with its comments, attachments, own rating and history; failed sections become warnings. */
  getIssueDetails(issueId: number): Observable<IssueDetail> {
    return this.http.get<Issue>(apiEndpoints.issueById(issueId)).pipe(
      switchMap((issue) => forkJoin({
        comments: optionalRequest(this.list<Comment>(apiEndpoints.commentsByIssue(issueId)), []),
        attachments: optionalRequest(this.getAttachments(issueId), []),
        ratings: optionalRequest(this.list<Rating>(apiEndpoints.ratingsByIssue(issueId)), []),
        // Older APIs refuse citizen history with 403; that is not an outage, so it is no warning.
        history: optionalRequest(
          this.list<StatusUpdate>(apiEndpoints.statusUpdatesByIssue(issueId)).pipe(
            catchError((error: unknown) => (error instanceof ApiError && error.status === 403 ? of([]) : throwError(() => error)))
          ),
          []
        )
      }).pipe(map(({ comments, attachments, ratings, history }) => {
        const userId = Number(this.session.getUser()?.userId);
        return {
          ...this.normalizeIssue(issue, [], []),
          comments: comments.value,
          attachments: attachments.value,
          statusUpdates: [...history.value].sort(
            (left, right) => new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
          ),
          rating: ratings.value.find((rating) => Number(rating.userId) === userId) ?? null,
          warnings: failedSections({ comments, attachments, ratings, "activity timeline": history })
        };
      })))
    );
  }

  /** Creates an issue in the same normalized shape as a list entry. */
  createIssue(payload: CreateIssueRequest, categories: Category[], regions: Region[]): Observable<Issue> {
    return this.http.post<Issue>(apiEndpoints.createIssue, payload).pipe(
      map((created) => this.normalizeIssue(
        { ...created, categoryId: Number(payload.categoryId) || null, regionId: Number(payload.regionId) || null },
        categories,
        regions
      ))
    );
  }

  /**
   * Attaches or replaces the issue's image URL (the API stores links; there is
   * no upload). A timed-out request may still have committed, so a failure is
   * re-checked before it is reported - otherwise Retry would create a duplicate.
   */
  async saveImageAttachment(
    issueId: number,
    imageUrl: string,
    options: { attachmentId: number } | { reconcileFirst?: boolean } = {}
  ): Promise<Attachment> {
    const updating = "attachmentId" in options;
    if (!updating && options.reconcileFirst) {
      const existing = await this.findImageAttachment(issueId, imageUrl);
      if (existing) return existing;
    }
    const body: AttachmentRequest = { issueId, fileUrl: imageUrl.trim(), fileType: "Image" };
    try {
      const saved = await firstValueFrom(updating
        ? this.http.put<Attachment>(apiEndpoints.updateAttachment(options.attachmentId), { fileUrl: body.fileUrl, fileType: body.fileType })
        : this.http.post<Attachment>(apiEndpoints.createAttachment, body));
      return this.normalizeAttachment(saved);
    } catch (error) {
      const saved = await this.findImageAttachment(issueId, imageUrl);
      // A timed-out PUT can still have committed; only accept the SAME attachment.
      if (saved && (!updating || Number(saved.attachmentId) === Number(options.attachmentId))) {
        return saved;
      }
      throw error;
    }
  }

  addComment(issueId: number, content: string): Observable<Comment> {
    return this.http.post<Comment>(apiEndpoints.createComment, { issueId, content: content.trim() });
  }

  /** ratingId null creates, otherwise updates. Create returns the rating; update wraps it in { rating }. */
  saveRating(ratingId: number | null, issueId: number, score: number, feedback: string | null): Observable<Rating> {
    const body = { score, feedback: String(feedback ?? "").trim() || null };
    const request = ratingId
      ? this.http.put<Rating | { rating: Rating }>(apiEndpoints.updateRating(ratingId), body)
      : this.http.post<Rating | { rating: Rating }>(apiEndpoints.createRating, { issueId, ...body });
    return request.pipe(map((response) => ("rating" in response ? response.rating : response)));
  }

  private async findImageAttachment(issueId: number, imageUrl: string): Promise<Attachment | null> {
    try {
      const attachments = await firstValueFrom(this.getAttachments(issueId));
      return attachments.find((attachment) => isMatchingImage(attachment, imageUrl)) ?? null;
    } catch {
      return null;
    }
  }

  /** The API answers 204 (null) for an empty list. */
  private list<T>(url: string): Observable<T[]> {
    return this.http.get<T[] | null>(url).pipe(map((value) => asArray<T>(value)));
  }

  private normalizeAttachment(attachment: Attachment): Attachment {
    return { ...attachment, fileUrl: resolveApiAssetUrl(attachment.fileUrl, this.apiBaseUrl) };
  }

  /** The DTO has category and region names, not ids; ids are matched from the lookup lists. */
  private normalizeIssue(issue: unknown, categories: Category[], regions: Region[]): Issue {
    const value = (isRecord(issue) ? issue : {}) as Partial<Issue>;
    const category = categories.find((item) => item.categoryName === value.categoryName);
    const region = regions.find((item) => item.regionName === value.regionName);
    return {
      ...(value as Issue),
      categoryId: value.categoryId ?? category?.categoryId ?? null,
      regionId: value.regionId ?? region?.regionId ?? null,
      governorate: value.governorate || region?.governorate || "",
      attachments: asArray<Attachment>(value.attachments),
      comments: asArray<Comment>(value.comments),
      statusUpdates: asArray<StatusUpdate>(value.statusUpdates),
      rating: value.rating ?? null,
      ui: value.ui ?? {}
    };
  }
}

/** True when an attachment is the image at exactly this URL. */
export function isMatchingImage(attachment: Attachment, imageUrl: string): boolean {
  return String(attachment?.fileUrl ?? "").trim() === imageUrl.trim()
    && String(attachment?.fileType ?? "").toLowerCase() === "image";
}

/** An issue is "fresh" while its newest status-change notification is unread. */
function markFreshUpdates(issues: Issue[], notifications: Notification[]): Issue[] {
  const latest = new Map<number, { notification: Notification; time: number }>();
  for (const notification of notifications) {
    if (String(notification?.type ?? "").toLowerCase() !== "statuschange") continue;
    const issueId = Number(notification.issueId);
    const time = parseApiDate(notification.createdAt).getTime();
    if (!Number.isInteger(issueId) || issueId < 1 || !Number.isFinite(time)) continue;
    const current = latest.get(issueId);
    if (!current || time > current.time) latest.set(issueId, { notification, time });
  }
  return issues.map((issue) => {
    const notification = latest.get(Number(issue.issueId))?.notification;
    if (!notification || notification.isRead) return issue;
    return {
      ...issue,
      ui: {
        ...issue.ui,
        hasFreshUpdate: true,
        freshUpdateLabel: "New update",
        freshUpdateAt: notification.createdAt,
        freshUpdateNotificationId: Number(notification.notificationId) || null
      }
    };
  });
}
