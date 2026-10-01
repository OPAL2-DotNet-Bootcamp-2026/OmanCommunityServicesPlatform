/**
 * Mirrors OmanCommunityServicesPlatform/Enums/*.cs.
 *
 * String unions, not numeric enums: the backend stores and serialises these as
 * strings (StoreEnumsAsStrings migration), so the JSON carries "Open", never 0.
 */

/** Enums/IssueStatus.cs */
export type IssueStatus = "Open" | "InProgress" | "Resolved";

/** Enums/IssuePriority.cs */
export type IssuePriority = "Low" | "Medium" | "High";

/** Enums/UserRole.cs */
export type UserRole = "Citizen" | "Staff" | "Admin";

/** Enums/NotificationType.cs */
export type NotificationType = "StatusChange" | "Comment" | "Assignment";

/** Enums/AttachmentFileType.cs */
export type AttachmentFileType = "Image" | "Document";

/** Enums/PaymentStatus.cs */
export type PaymentStatus = "Pending" | "Paid" | "Cancelled";

/** Enums/Governorate.cs */
export type Governorate =
  | "Muscat"
  | "Dhofar"
  | "Musandam"
  | "AlBuraimi"
  | "AdDakhiliyah"
  | "AlBatinahNorth"
  | "AlBatinahSouth"
  | "AshSharqiyahNorth"
  | "AshSharqiyahSouth"
  | "AdhDhahirah"
  | "AlWusta";

/** UserRole widened with "" for "signed out or unrecognised". */
export type SessionRole = UserRole | "";
