/**
 * The citizen-facing read layer.
 *
 * Its defining trait is that it degrades rather than fails: the issue list is
 * the essential request, and the lookups around it are allowed to fail
 * independently. Failed section names come back in warnings[].
 */
import type { ApiClient } from "../core/api-client";
import { asArray, rejectedSections, settledValue } from "../core/settled";
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
  Region
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
      // The backend restricts status history to Staff and Admin. Citizens see
      // the real currentStatus and reportedDate from the issue DTO instead.
      statusUpdates: [],
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
    const issues = asArray<Issue>(await this.api.get<Issue[]>(this.api.endpoints.myIssues));

    const results = await Promise.allSettled([
      this.api.get<Category[]>(this.api.endpoints.categories),
      this.api.get<Region[]>(this.api.endpoints.regions),
      this.api.get<Notification[]>(this.api.endpoints.myNotifications)
    ]);

    const categories = asArray<Category>(settledValue(results[0], []));
    const regions = asArray<Region>(settledValue(results[1], []));
    const notifications = asArray<Notification>(settledValue(results[2], []));

    return {
      currentUser: this.currentUser(),
      notifications,
      categories,
      regions,
      issues: issues.map((issue) => this.normalizeIssue(issue, categories, regions)),
      warnings: rejectedSections(results, ["categories", "regions", "notifications"])
    };
  }

  async getIssueDetails(issueId: number): Promise<IssueDetail> {
    const issue = await this.api.get<Issue>(this.api.endpoints.issueById(issueId));

    const results = await Promise.allSettled([
      this.api.get<Comment[]>(this.api.endpoints.commentsByIssue(issueId)),
      this.api.get<Attachment[]>(this.api.endpoints.attachmentsByIssue(issueId)),
      this.api.get<Rating[]>(this.api.endpoints.ratingsByIssue(issueId))
    ]);

    const ratings = asArray<Rating>(settledValue(results[2], []));
    const userId = Number(this.currentUser()?.userId);
    const ownRating = ratings.find((rating) => Number(rating.userId) === userId) ?? null;

    return {
      ...this.normalizeIssue(issue, [], []),
      comments: asArray<Comment>(settledValue(results[0], [])),
      attachments: asArray<Attachment>(settledValue(results[1], [])).map((attachment) =>
        this.normalizeAttachment(attachment)
      ),
      rating: ownRating,
      warnings: rejectedSections(results, ["comments", "attachments", "ratings"])
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
   * Attaches a link to an issue.
   *
   * The backend stores a URL string - there is no upload endpoint anywhere in
   * the API - so an attachment is a link to something already online. The
   * route is Citizen-only, which is why nothing on the staff dashboard calls
   * this.
   */
  async addAttachment(
    issueId: number,
    fileUrl: string,
    fileType: AttachmentFileType
  ): Promise<Attachment> {
    const created = await this.api.post<Attachment>(this.api.endpoints.createAttachment, {
      issueId: Number(issueId),
      fileUrl: String(fileUrl).trim(),
      fileType
    });
    return this.normalizeAttachment(created);
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
