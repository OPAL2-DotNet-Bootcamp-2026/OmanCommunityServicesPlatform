/**
 * The staff and admin read/write layer.
 *
 * Same degrade-rather-than-fail shape as DataService: the issue collection is
 * the primary resource and everything around it may fail independently.
 */
import type { ApiClient } from "../core/api-client";
import { asArray, rejectedSections, requiredValue, settledArray } from "../core/settled";
import type {
  Attachment,
  Category,
  CategoryRequest,
  ChangeIssueStatusRequest,
  Comment,
  Department,
  DepartmentRequest,
  Issue,
  IssueDetail,
  Notification,
  Rating,
  Region,
  RegionRequest,
  StatusUpdate
} from "../models";
import type { SessionService, SessionUser } from "./session.service";

export interface StaffDashboardData {
  currentUser: SessionUser;
  issues: Issue[];
  categories: Category[];
  regions: Region[];
  departments: Department[];
  notifications: Notification[];
  statusUpdates: StatusUpdate[];
  warnings: string[];
}

/** An issue detail plus every rating on it, not just the reporter's. */
export interface StaffIssueDetail extends IssueDetail {
  ratings: Rating[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function byDateAscending(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

export class DashboardService {
  constructor(
    private readonly api: ApiClient,
    private readonly session: SessionService
  ) {}

  /** Throws rather than returning null: no staff session, no dashboard. */
  private actor(): SessionUser {
    const user = this.session.getUser();
    if (!user || !["Staff", "Admin"].includes(user.role)) {
      throw new Error("A Staff or Admin session is required for the dashboard.");
    }
    return user;
  }

  private normalizeIssue(issue: unknown): Issue {
    const value = (isRecord(issue) ? issue : {}) as Partial<Issue>;
    return {
      ...(value as Issue),
      ui: {
        imageUrl: "",
        imageAlt: "",
        imageStyle: "document",
        previewLabel: "Issue attachment",
        mapAreaName: value.regionName || "Issue location",
        mapVariant: "city",
        hasFreshUpdate: false
      }
    };
  }

  private normalizeAttachment(attachment: Attachment): Attachment {
    return {
      ...attachment,
      fileUrl: this.api.resolveApiAssetUrl(attachment.fileUrl),
      label: `Attachment ${attachment.attachmentId || ""}`.trim(),
      style: "document"
    };
  }

  async getStaffDashboardData(): Promise<StaffDashboardData> {
    const currentUser = this.actor();

    const results = await Promise.allSettled([
      this.api.get<Issue[]>(this.api.endpoints.allIssues),
      this.api.get<Category[]>(this.api.endpoints.categories),
      this.api.get<Region[]>(this.api.endpoints.regions),
      this.api.get<Department[]>(this.api.endpoints.departments),
      this.api.get<Notification[]>(this.api.endpoints.myNotifications),
      this.api.get<StatusUpdate[]>(this.api.endpoints.allStatusUpdates)
    ]);

    const issues = asArray<Issue>(requiredValue(results[0]));

    return {
      currentUser: { ...currentUser },
      issues: issues.map((issue) => this.normalizeIssue(issue)),
      categories: settledArray(results[1]),
      regions: settledArray(results[2]),
      departments: settledArray(results[3]),
      notifications: settledArray(results[4]),
      statusUpdates: settledArray(results[5]),
      warnings: rejectedSections(results.slice(1), [
        "categories",
        "regions",
        "departments",
        "notifications",
        "status history"
      ])
    };
  }

  /**
   * Issue LIST responses carry no attachments, so a card has nothing to build a
   * preview from. This fetches them for one issue without changing the backend
   * contract; the dashboard calls it per visible card.
   */
  async getStaffIssueAttachments(issueId: number): Promise<Attachment[]> {
    const attachments = await this.api.get<Attachment[]>(
      this.api.endpoints.attachmentsByIssue(Number(issueId))
    );
    return asArray<Attachment>(attachments).map((attachment) =>
      this.normalizeAttachment(attachment)
    );
  }

  async getStaffIssueDetails(issueId: number): Promise<StaffIssueDetail> {
    const results = await Promise.allSettled([
      this.api.get<Issue>(this.api.endpoints.issueById(issueId)),
      this.api.get<Comment[]>(this.api.endpoints.commentsByIssue(issueId)),
      this.getStaffIssueAttachments(issueId),
      this.api.get<StatusUpdate[]>(this.api.endpoints.statusUpdatesByIssue(issueId)),
      this.api.get<Rating[]>(this.api.endpoints.ratingsByIssue(issueId))
    ]);

    const issue = this.normalizeIssue(requiredValue(results[0]));

    // Newest first, so the reporter's most recent feedback wins.
    const ratings = settledArray(results[4])
      .slice()
      .sort((left, right) => byDateAscending(right.ratedAt, left.ratedAt));
    const reporterRating =
      ratings.find((rating) => Number(rating.userId) === Number(issue.reportedById)) ?? null;

    return {
      ...issue,
      comments: settledArray(results[1]),
      attachments: settledArray(results[2]),
      statusUpdates: settledArray(results[3]).sort((left, right) =>
        byDateAscending(left.updatedAt, right.updatedAt)
      ),
      ratings,
      rating: reporterRating,
      warnings: rejectedSections(results.slice(1), [
        "comments",
        "attachments",
        "activity timeline",
        "ratings"
      ])
    };
  }

  changeIssueStatus(issueId: number, payload: ChangeIssueStatusRequest): Promise<Issue> {
    return this.api.put<Issue>(this.api.endpoints.changeIssueStatus(issueId), {
      newStatus: String(payload.newStatus ?? ""),
      notes: String(payload.notes ?? "").trim() || null
    });
  }

  addStaffComment(issueId: number, content: string): Promise<Comment> {
    return this.api.post<Comment>(this.api.endpoints.createComment, {
      issueId: Number(issueId),
      content: String(content ?? "").trim()
    });
  }

  /**
   * Throws synchronously for non-Admins. This is a UI guard, not a security
   * boundary - the backend enforces it too - but the dashboard's error banner
   * depends on the throw.
   */
  private requireAdmin(): void {
    if (this.actor().role !== "Admin") {
      throw new Error("Only an Admin can change platform setup.");
    }
  }

  createRegion(payload: RegionRequest): Promise<Region> {
    this.requireAdmin();
    return this.api.post<Region>(this.api.endpoints.createRegion, payload);
  }

  createDepartment(payload: DepartmentRequest): Promise<Department> {
    this.requireAdmin();
    return this.api.post<Department>(this.api.endpoints.createDepartment, payload);
  }

  createCategory(payload: CategoryRequest): Promise<Category> {
    this.requireAdmin();
    return this.api.post<Category>(this.api.endpoints.createCategory, payload);
  }
}
