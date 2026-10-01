/** Issues and their status history (DTOs/IssueDTOs.cs, DTOs/StatusUpdateDTOs.cs). */
import { type Attachment } from "./attachment.model";
import { type Comment } from "./comment.model";
import { type Governorate, type IssuePriority, type IssueStatus } from "./enums";
import { type Rating } from "./rating.model";

/**
 * Presentation-only fields a page attaches to an issue. Never sent by the API;
 * the card and dialog components read them for imagery and "new update" flags.
 */
export interface IssueUi {
  imageUrl?: string;
  imageAlt?: string;
  imageStyle?: string;
  previewLabel?: string;
  hasFreshUpdate?: boolean;
  /** Wording of the "new update" flash on a card. */
  freshUpdateLabel?: string;
  /** When the status change behind the flash happened. */
  freshUpdateAt?: string;
  /** The notification the flash was derived from. */
  freshUpdateNotificationId?: number | null;
  updateTitle?: string;
  updateMessage?: string;
  mapAreaName?: string;
  mapVariant?: string;
  /** Prefills the image-update form with the URL currently attached. */
  editableImageUrl?: string;
  /** False suppresses the image-update panel for an issue. */
  imageUpdateAvailable?: boolean;
  /** True once the separate attachments request for this issue has resolved. */
  attachmentsLoaded?: boolean;
}

/**
 * IssueResponseDto plus fields resolved client-side. categoryId, regionId and
 * governorate are matched from the lookup lists by name, hence nullable.
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
  /** True only once an urgent-handling payment is confirmed Paid. */
  isUrgent: boolean;
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

/** An issue with its optional sections loaded, and the names of any that failed. */
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

export interface StatusUpdate {
  statusUpdateId: number;
  issueId: number;
  updatedById: number;
  previousStatus: IssueStatus;
  newStatus: IssueStatus;
  notes: string | null;
  updatedAt: string;
}
