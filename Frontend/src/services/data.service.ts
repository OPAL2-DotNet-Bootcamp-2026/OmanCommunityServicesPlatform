/**
 * The citizen-facing read layer.
 *
 * Its defining trait is that it degrades rather than fails: the issue list is
 * the essential request, and the lookups around it are allowed to fail
 * independently. Failed section names come back in warnings[].
 */
import type { ApiClient } from "../core/api-client";
import { config } from "../core/config";
import { asArray, rejectedSections, settledValue } from "../core/settled";
import { parseApiDate } from "../date";
import type {
  Attachment,
  AttachmentFileType,
  Category,
  Comment,
  CreateIssueRequest,
  Issue,
  IssueDetail,
  Notification,
  Rating,
  Region,
  StatusUpdate
} from "../models";
import type { SessionService, SessionUser } from "./session.service";

export interface CitizenDashboardData {
  currentUser: SessionUser | null;
  notifications: Notification[];
  categories: Category[];
  regions: Region[];
  issues: Issue[];
  /** Names of sections whose requests failed, e.g. ["categories"]. */
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Calendar day in the portal's own time zone, for "did this happen today". */
function portalDateKey(value: string | Date): string {
  const date = parseApiDate(value instanceof Date ? value.toISOString() : value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    const values: Record<string, string> = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone: config.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .formatToParts(date)
      .forEach((part) => {
        if (part.type !== "literal") {
          values[part.type] = part.value;
        }
      });
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Flags issues that have moved recently, so their card can show a ribbon.
 *
 * Status history is staff-only, but a citizen already receives a StatusChange
 * notification linked to the issue. Reading the notifications the page has
 * already fetched gives the same signal with no extra request and no backend
 * change.
 *
 * An issue is "fresh" if its newest status-change notification is unread, or
 * happened today - so a citizen who read the notification still sees the
 * ribbon for the rest of the day, and it clears on its own tomorrow.
 */
function decorateIssuesWithFreshUpdates(issues: Issue[], notifications: Notification[]): Issue[] {
  const latestByIssue = new Map<number, { notification: Notification; createdTime: number }>();

  notifications.forEach((notification) => {
    if (String(notification?.type ?? "").toLowerCase() !== "statuschange") {
      return;
    }

    const issueId = Number(notification.issueId);
    const createdTime = parseApiDate(notification.createdAt).getTime();
    if (!Number.isInteger(issueId) || issueId < 1 || !Number.isFinite(createdTime)) {
      return;
    }

    const current = latestByIssue.get(issueId);
    if (!current || createdTime > current.createdTime) {
      latestByIssue.set(issueId, { notification, createdTime });
    }
  });

  const todayKey = portalDateKey(new Date());

  return issues.map((issue) => {
    const latest = latestByIssue.get(Number(issue.issueId));
    if (!latest) {
      return issue;
    }

    const notification = latest.notification;
    const updatedToday = portalDateKey(notification.createdAt) === todayKey;
    if (notification.isRead && !updatedToday) {
      return issue;
    }

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

export class DataService {
  constructor(
    private readonly api: ApiClient,
    private readonly session: SessionService
  ) {}

  private currentUser(): SessionUser | null {
    return this.session.getUser();
  }

  private normalizeAttachment(attachment: Attachment): Attachment {
    return { ...attachment, fileUrl: this.api.resolveApiAssetUrl(attachment.fileUrl) };
  }

  /**
   * The DTO carries category and region names but not their ids, so they are
   * resolved here by matching against the lookup lists.
   */
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
      // Empty on a LIST entry, which carries no history. getIssueDetails fills
      // it from the status-update endpoint.
      statusUpdates: asArray<StatusUpdate>(value.statusUpdates),
      rating: value.rating ?? null,
      ui: value.ui ?? {}
    };
  }

  async getNotifications(): Promise<Notification[]> {
    return asArray<Notification>(
      await this.api.get<Notification[]>(this.api.endpoints.myNotifications)
    );
  }

  async getUnreadNotifications(): Promise<Notification[]> {
    return asArray<Notification>(
      await this.api.get<Notification[]>(this.api.endpoints.unreadNotifications)
    );
  }

  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    await this.api.patch(this.api.endpoints.markNotificationRead(notificationId));
    return true;
  }

  async updateNotificationReadStatus(notificationId: number, isRead: boolean): Promise<boolean> {
    await this.api.patch(this.api.endpoints.updateNotificationReadStatus(notificationId), {
      isRead: Boolean(isRead)
    });
    return true;
  }

  async getDashboardData(): Promise<CitizenDashboardData> {
    // All four start together rather than awaiting the issues first. Issues
    // stay essential - a failure there fails the page - while the lookups and
    // notifications around them only produce warnings.
    const results = await Promise.allSettled([
      this.api.get<Issue[]>(this.api.endpoints.myIssues),
      this.api.get<Category[]>(this.api.endpoints.categories),
      this.api.get<Region[]>(this.api.endpoints.regions),
      this.api.get<Notification[]>(this.api.endpoints.myNotifications)
    ]);

    const issuesResult = results[0];
    if (issuesResult.status === "rejected") {
      throw issuesResult.reason;
    }

    const issues = asArray<Issue>(issuesResult.value);
    const categories = asArray<Category>(settledValue(results[1], []));
    const regions = asArray<Region>(settledValue(results[2], []));
    const notifications = asArray<Notification>(settledValue(results[3], []));

    return {
      currentUser: this.currentUser(),
      notifications,
      categories,
      regions,
      issues: decorateIssuesWithFreshUpdates(
        issues.map((issue) => this.normalizeIssue(issue, categories, regions)),
        notifications
      ),
      warnings: rejectedSections(results.slice(1), ["categories", "regions", "notifications"])
    };
  }

  /**
   * Issue LIST responses carry no attachments, so a card has nothing to build a
   * preview from. Fetched per issue rather than changing the backend contract.
   */
  async getIssueAttachments(issueId: number): Promise<Attachment[]> {
    const attachments = await this.api.get<Attachment[]>(
      this.api.endpoints.attachmentsByIssue(Number(issueId))
    );
    return asArray<Attachment>(attachments).map((attachment) =>
      this.normalizeAttachment(attachment)
    );
  }

  async getIssueDetails(issueId: number): Promise<IssueDetail> {
    const issue = await this.api.get<Issue>(this.api.endpoints.issueById(issueId));

    const results = await Promise.allSettled([
      this.api.get<Comment[]>(this.api.endpoints.commentsByIssue(issueId)),
      this.getIssueAttachments(issueId),
      this.api.get<Rating[]>(this.api.endpoints.ratingsByIssue(issueId)),
      // The reporter may now read their own history. The API strips the staff
      // internal notes and the officer id before it leaves the server, so what
      // arrives here is already what a citizen is allowed to see.
      this.api.get<StatusUpdate[]>(this.api.endpoints.statusUpdatesByIssue(issueId))
    ]);

    const ratings = asArray<Rating>(settledValue(results[2], []));
    const userId = Number(this.currentUser()?.userId);
    const ownRating = ratings.find((rating) => Number(rating.userId) === userId) ?? null;

    return {
      ...this.normalizeIssue(issue, [], []),
      comments: asArray<Comment>(settledValue(results[0], [])),
      attachments: asArray<Attachment>(settledValue(results[1], [])),
      statusUpdates: asArray<StatusUpdate>(settledValue(results[3], [])).sort(
        (left, right) =>
          new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
      ),
      rating: ownRating,
      warnings: rejectedSections(results, [
        "comments",
        "attachments",
        "ratings",
        "activity timeline"
      ])
    };
  }

  /**
   * Creates the issue and returns it in the same shape as a list entry.
   *
   * This used to read the issue back, because IssueService.Create set
   * assignedDepartmentName from a navigation property it never loaded, so the
   * create response did not match the list response. The backend sets it from
   * the category's department now, so the extra request is gone.
   */
  async createIssue(
    payload: CreateIssueRequest,
    categories: Category[] = [],
    regions: Region[] = []
  ): Promise<Issue> {
    const created = await this.api.post<Issue>(this.api.endpoints.createIssue, payload);

    return this.normalizeIssue(
      {
        ...created,
        categoryId: Number(payload.categoryId) || null,
        regionId: Number(payload.regionId) || null
      },
      categories,
      regions
    );
  }

  /**
   * Attaches a URL to an issue. The issue must exist first, which is why this
   * is a second call rather than part of the create payload.
   *
   * The backend stores a link - there is no upload endpoint in the API - and
   * the route is Citizen-only.
   */
  async createAttachment(payload: {
    issueId: number;
    fileUrl: string;
    fileType?: AttachmentFileType;
  }): Promise<Attachment> {
    const attachment = await this.api.post<Attachment>(this.api.endpoints.createAttachment, {
      issueId: Number(payload.issueId),
      fileUrl: String(payload.fileUrl ?? "").trim(),
      fileType: payload.fileType ?? "Image"
    });
    return this.normalizeAttachment(attachment);
  }

  /** A citizen may replace the URL of an attachment they uploaded. */
  async updateAttachment(
    attachmentId: number,
    payload: { fileUrl: string; fileType?: AttachmentFileType }
  ): Promise<Attachment> {
    const attachment = await this.api.put<Attachment>(
      this.api.endpoints.updateAttachment(Number(attachmentId)),
      {
        fileUrl: String(payload.fileUrl ?? "").trim(),
        fileType: payload.fileType ?? "Image"
      }
    );
    return this.normalizeAttachment(attachment);
  }

  addComment(issueId: number, content: string): Promise<Comment> {
    return this.api.post<Comment>(this.api.endpoints.createComment, {
      issueId: Number(issueId),
      content: String(content ?? "").trim()
    });
  }

  /** ratingId null creates, otherwise updates. */
  async saveRating(
    ratingId: number | null,
    issueId: number,
    score: number,
    feedback: string | null
  ): Promise<Rating> {
    const payload = {
      score: Number(score),
      feedback: String(feedback ?? "").trim() || null
    };

    const response = ratingId
      ? await this.api.put<Rating | { rating: Rating }>(
          this.api.endpoints.updateRating(ratingId),
          payload
        )
      : await this.api.post<Rating | { rating: Rating }>(this.api.endpoints.createRating, {
          issueId: Number(issueId),
          ...payload
        });

    // Create returns the rating directly; update wraps it in { rating }.
    return "rating" in response ? response.rating : response;
  }
}
