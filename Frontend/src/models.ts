/**
 * TypeScript mirrors of the backend contract, hand-written from
 * OmanCommunityServicesPlatform/OmanCommunityServicesPlatform/DTOs/*.cs.
 *
 * Three translation rules used throughout:
 *   1. C# "string?" and "int?" become "| null", not "?:". The API sends the key
 *      with a null value, it does not omit the key.
 *   2. "DateTime" becomes "string" - it arrives as ISO-8601 in JSON.
 *   3. C# enums become the string unions in enums.ts, because the backend
 *      stores and serialises them as strings (StoreEnumsAsStrings migration).
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

/* ---------- Region ---------- */

export interface Region {
  regionId: number;
  regionName: string;
  governorate: Governorate;
}

export interface RegionRequest {
  regionName: string;
  governorate: Governorate;
}

/* ---------- User ---------- */

export interface User {
  userId: number;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  regionId: number | null;
  departmentId: number | null;
  registrationDate: string;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * LoginResponseDto. The backend spells the token with a capital T; the session
 * service accepts either casing, so both are optional here and it picks.
 */
export interface LoginResponse {
  Token?: string;
  token?: string;
  userId: number;
  name: string;
  role: UserRole;
  email?: string;
  phoneNumber?: string | null;
  regionId?: number | null;
  departmentId?: number | null;
  departmentName?: string | null;
  isActive?: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber: string | null;
  regionId: number | null;
}

/* ---------- Issue ---------- */

/**
 * Presentation-only fields the pages attach to an issue. Never sent by the API;
 * the renderers read them to decide imagery and "new update" badges.
 */
export interface IssueUi {
  imageUrl?: string;
  imageAlt?: string;
  imageStyle?: string;
  previewLabel?: string;
  hasFreshUpdate?: boolean;
  updateTitle?: string;
  updateMessage?: string;
  mapAreaName?: string;
  mapVariant?: string;
}

/**
 * IssueResponseDto, plus the fields the data service resolves client-side.
 *
 * categoryId, regionId and governorate are not on the DTO - the data service
 * fills them by matching categoryName and regionName against the lookup lists,
 * which is why they are nullable.
 */
export interface Issue {
  issueId: number;
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  priority: IssuePriority;
  currentStatus: IssueStatus;
  reportedDate: string;
  reportedById: number;
  categoryName: string;
  regionName: string;
  assignedDepartmentName: string | null;

  categoryId: number | null;
  regionId: number | null;
  governorate: Governorate | "";

  attachments: Attachment[];
  comments: Comment[];
  statusUpdates: StatusUpdate[];
  rating: Rating | null;
  ui: IssueUi;
}

/** An issue whose optional sections have been loaded, with any partial failures. */
export interface IssueDetail extends Issue {
  warnings: string[];
}

export interface CreateIssueRequest {
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  priority: IssuePriority;
  categoryId: number;
  regionId: number;
}

export interface ChangeIssueStatusRequest {
  newStatus: IssueStatus;
  notes: string | null;
}

/* ---------- Category ---------- */

export interface Category {
  categoryId: number;
  categoryName: string;
  description: string | null;
  departmentId: number;
  departmentName: string | null;
  issueCount: number;
}

export interface CategoryRequest {
  categoryName: string;
  description: string | null;
  departmentId: number;
}

/* ---------- Department ---------- */

export interface Department {
  departmentId: number;
  departmentName: string;
  description: string | null;
  contactEmail: string;
  regionId: number | null;
  regionName: string | null;
  categoryCount: number;
  issueCount: number;
  userCount: number;
}

export interface DepartmentRequest {
  departmentName: string;
  description: string | null;
  contactEmail: string;
  regionId: number | null;
}

/* ---------- Comment ---------- */

export interface Comment {
  commentId: number;
  issueId: number;
  userId: number;
  userName: string | null;
  content: string;
  isStaffComment: boolean;
  commentDate: string;
}

export interface CreateCommentRequest {
  issueId: number;
  content: string;
}

/* ---------- Attachment ---------- */

export interface Attachment {
  attachmentId: number;
  issueId: number;
  uploadedById: number;
  fileUrl: string;
  fileType: AttachmentFileType;
  uploadedAt: string;
  /** Presentation labels the services attach; never sent by the API. */
  label?: string;
  style?: string;
}

/* ---------- Rating ---------- */

export interface Rating {
  ratingId: number;
  issueId: number;
  userId: number;
  score: number;
  feedback: string | null;
  ratedAt: string;
}

export interface CreateRatingRequest {
  issueId: number;
  score: number;
  feedback: string | null;
}

/* ---------- Notification ---------- */

export interface Notification {
  notificationId: number;
  userId: number;
  issueId: number | null;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

/* ---------- StatusUpdate ---------- */

export interface StatusUpdate {
  statusUpdateId: number;
  issueId: number;
  updatedById: number;
  previousStatus: IssueStatus;
  newStatus: IssueStatus;
  notes: string | null;
  updatedAt: string;
}
