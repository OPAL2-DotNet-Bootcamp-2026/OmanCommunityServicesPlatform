/**
 * TypeScript mirrors of the backend contract, hand-written from
 * OmanCommunityServicesPlatform/OmanCommunityServicesPlatform/DTOs/*.cs.
 *
 * MEMBER 1 OWNS THIS FILE. Everyone else only reads from it.
 *
 * Region is finished as the worked example. The rest carry their DTO field
 * list as a comment and one starter field; filling them in is your task.
 *
 * Three translation rules, all visible in Region below:
 *   1. C# "string?" and "int?" become "| null", NOT "?:". The API sends the key
 *      with a null value, it does not omit the key. "?:" is a different claim.
 *   2. "DateTime" becomes "string" - it arrives as ISO-8601 in JSON.
 *   3. C# enums become the string unions in enums.ts.
 */
import type {
  AttachmentFileType,
  Governorate,
  IssuePriority,
  IssueStatus,
  NotificationType,
  UserRole
} from "./enums";

// Re-exported so everything else has one place to import types from:
//   import type { Issue, IssueStatus } from "../models";
export type * from "./enums";

/* ---------- Region - WORKED EXAMPLE, finished ---------- */

/** RegionResponseDto */
export interface Region {
  regionId: number;
  regionName: string;
  governorate: Governorate;
}

/** CreateRegionDto / UpdateRegionDto - same shape. */
export interface RegionRequest {
  regionName: string;
  governorate: Governorate;
}

/* ---------- User ----------
 * UserResponseDto   userId int, name string, email string, phoneNumber string?,
 *                   role UserRole, regionId int?, departmentId int?,
 *                   registrationDate DateTime, isActive bool
 * LoginResponseDto  Token string, userId int, name string, role UserRole
 *                   NOTE the capital T. session-service.js:138 accepts both
 *                   spellings; keep that tolerance.
 * LoginDto          email string, password string
 * RegisterUserDto   name, email, password string, phoneNumber string?,
 *                   regionId int?
 */

export interface User {
  userId: number;
  role: UserRole;
  // TODO(Member 1): the remaining UserResponseDto fields.
}

export interface LoginRequest {
  email: string;
  // TODO(Member 1)
}

export interface LoginResponse {
  token: string;
  // TODO(Member 1)
}

export interface RegisterRequest {
  name: string;
  // TODO(Member 1)
}

/* ---------- Issue ----------
 * IssueResponseDto      issueId int, title string, description string,
 *                       location string, latitude decimal?, longitude decimal?,
 *                       priority IssuePriority, currentStatus IssueStatus,
 *                       reportedDate DateTime, reportedById int,
 *                       categoryName string, regionName string,
 *                       assignedDepartmentName string?
 * CreateIssueDto        title, description, location string, latitude decimal?,
 *                       longitude decimal?, priority IssuePriority,
 *                       categoryId int, regionId int
 * ChangeIssueStatusDto  newStatus IssueStatus, notes string?
 *
 * Two things the DTO does not tell you, both from data-service.js:39 - the
 * frontend decorates an issue after fetching it:
 *   - categoryId, regionId and governorate are resolved client-side by matching
 *     categoryName and regionName against the lookup lists, so they are
 *     nullable here.
 *   - attachments, comments, statusUpdates, rating and a ui bag are attached by
 *     the data service. That is IssueDetail below, not optional fields on Issue.
 *
 * "decimal?" becomes "number | null" - JavaScript has no decimal type.
 */

export interface Issue {
  issueId: number;
  title: string;
  currentStatus: IssueStatus;
  priority: IssuePriority;
  // TODO(Member 1): the remaining IssueResponseDto fields.
}

/** Issue plus the sections the data service attaches after fetching. */
export interface IssueDetail extends Issue {
  // TODO(Member 1): attachments, comments, statusUpdates, rating, ui
  warnings?: string[];
}

export interface CreateIssueRequest {
  title: string;
  // TODO(Member 1)
}

export interface ChangeIssueStatusRequest {
  newStatus: IssueStatus;
  // TODO(Member 1)
}

/* ---------- Category ----------
 * ResponseCategoryDTO  categoryId int, categoryName string, description string?,
 *                      departmentId int, departmentName string?, issueCount int
 * CreateCategoryDTO    categoryName string, description string?, departmentId int
 */

export interface Category {
  categoryId: number;
  categoryName: string;
  // TODO(Member 1)
}

export interface CategoryRequest {
  categoryName: string;
  // TODO(Member 1)
}

/* ---------- Department ----------
 * ResponseDepartmentDTO  departmentId int, departmentName string,
 *                        description string?, contactEmail string,
 *                        regionId int?, regionName string?, categoryCount int,
 *                        issueCount int, userCount int
 * CreateDepartmentDTO    departmentName string, description string?,
 *                        contactEmail string, regionId int?
 */

export interface Department {
  departmentId: number;
  departmentName: string;
  // TODO(Member 1)
}

export interface DepartmentRequest {
  departmentName: string;
  // TODO(Member 1)
}

/* ---------- Comment ----------
 * CommentResponseDto  commentId int, issueId int, userId int, userName string?,
 *                     content string, isStaffComment bool, commentDate DateTime
 * CreateCommentDto    issueId int, content string
 */

export interface Comment {
  commentId: number;
  content: string;
  // TODO(Member 1)
}

export interface CreateCommentRequest {
  issueId: number;
  // TODO(Member 1)
}

/* ---------- Attachment ----------
 * AttachmentResponseDto  attachmentId int, issueId int, uploadedById int,
 *                        fileUrl string, fileType AttachmentFileType,
 *                        uploadedAt DateTime
 *
 * data-service.js:28 rewrites fileUrl through resolveApiAssetUrl before it
 * reaches a renderer, so a component always sees an absolute URL. The type does
 * not change - that is a comment, not a second interface.
 */

export interface Attachment {
  attachmentId: number;
  fileUrl: string;
  fileType: AttachmentFileType;
  // TODO(Member 1)
}

/* ---------- Rating ----------
 * ResponseRatingDto  ratingId int, issueId int, userId int, score int,
 *                    feedback string?, ratedAt DateTime
 * CreateRatingDto    issueId int, score int (1-5), feedback string?
 *
 * The backend validates score as 1-5. You could model it as 1 | 2 | 3 | 4 | 5
 * instead of number. Try it and see whether it makes the rating code in
 * my-issues nicer or more annoying - either answer is defensible, knowing why
 * is the point.
 */

export interface Rating {
  ratingId: number;
  score: number;
  // TODO(Member 1)
}

export interface CreateRatingRequest {
  issueId: number;
  // TODO(Member 1)
}

/* ---------- Notification ----------
 * NotificationResponseDto  notificationId int, userId int, issueId int?,
 *                          message string, type NotificationType, isRead bool,
 *                          createdAt DateTime
 */

export interface Notification {
  notificationId: number;
  message: string;
  type: NotificationType;
  isRead: boolean;
  // TODO(Member 1)
}

/* ---------- StatusUpdate ----------
 * StatusUpdateResponseDto  statusUpdateId int, issueId int, updatedById int,
 *                          previousStatus IssueStatus, newStatus IssueStatus,
 *                          notes string?, updatedAt DateTime
 *
 * Citizens never receive these - the backend restricts status history to Staff
 * and Admin, which is why data-service.js:52 hard-codes statusUpdates to [].
 */

export interface StatusUpdate {
  statusUpdateId: number;
  newStatus: IssueStatus;
  // TODO(Member 1)
}
