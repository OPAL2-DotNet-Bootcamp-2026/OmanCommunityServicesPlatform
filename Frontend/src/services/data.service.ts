/**
 * The citizen-facing read layer.
 *
 * Its defining trait is that it degrades rather than fails: the issue list is
 * the essential request, and the lookups around it are allowed to fail
 * independently. Failed section names come back in warnings[].
 */
import { ApiError, type ApiClient } from "../core/api-client";
import { asArray, rejectedSections, requiredValue, settledArray } from "../core/settled";
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

/** An issue stays fresh while its newest valid status-change notification is unread. */
function decorateIssuesWithFreshUpdates(issues: Issue[], notifications: Notification[]): Issue[] {
  const latestByIssue = new Map<number, { notification: Notification; createdTime: number }>();

  for (const notification of notifications) {
    if (String(notification?.type ?? "").toLowerCase() !== "statuschange") {
      continue;
    }

    const issueId = Number(notification.issueId);
    const createdTime = parseApiDate(notification.createdAt).getTime();
    if (!Number.isInteger(issueId) || issueId < 1 || !Number.isFinite(createdTime)) {
      continue;
    }

    const current = latestByIssue.get(issueId);
    if (!current || createdTime > current.createdTime) {
      latestByIssue.set(issueId, { notification, createdTime });
    }
  }

  return issues.map((issue) => {
    const notification = latestByIssue.get(Number(issue.issueId))?.notification;
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

export class DataService {
  constructor(
    private readonly api: ApiClient,
    private readonly session: SessionService
  ) {}

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

    const issues = asArray<Issue>(requiredValue(results[0]));

    const categories = settledArray(results[1]);
    const regions = settledArray(results[2]);
    const notifications = settledArray(results[3]);

    return {
      currentUser: this.session.getUser(),
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
      // The API removes staff-only notes and officer IDs from citizen history.
      this.api.get<StatusUpdate[]>(this.api.endpoints.statusUpdatesByIssue(issueId))
    ]);

    const ratings = settledArray(results[2]);
    const userId = Number(this.session.getUser()?.userId);
    const ownRating = ratings.find((rating) => Number(rating.userId) === userId) ?? null;

    // Older APIs refuse citizen history with 403; only warn for actual outages.
    const historyResult = results[3];
    const historyForbidden =
      historyResult.status === "rejected" &&
      historyResult.reason instanceof ApiError &&
      historyResult.reason.status === 403;

    const optionalSections = historyForbidden ? results.slice(0, 3) : results;

    return {
      ...this.normalizeIssue(issue, [], []),
      comments: settledArray(results[0]),
      attachments: settledArray(results[1]),
      statusUpdates: settledArray(results[3]).sort(
        (left, right) => new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
      ),
      rating: ownRating,
      warnings: rejectedSections(optionalSections, [
        "comments",
        "attachments",
        "ratings",
        "activity timeline"
      ])
    };
  }

  /** Creates an issue in the same normalized shape as a list entry. */
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
