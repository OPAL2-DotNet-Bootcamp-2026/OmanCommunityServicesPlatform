/** Issue attachments (DTOs/AttachmentDTOs.cs). The API stores links, not uploads. */
import { type AttachmentFileType } from "./enums";

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
  fileName?: string;
}

export interface AttachmentRequest {
  issueId: number;
  fileUrl: string;
  fileType: AttachmentFileType;
}
