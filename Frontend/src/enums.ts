/**
 * Mirrors the enums in OmanCommunityServicesPlatform/Enums/.
 *
 * These are written out for you because every other model depends on them and
 * there is nothing to learn from transcribing them a second time.
 *
 * Note they are string unions, not numeric enums. The backend stores and
 * serialises these as strings (see the StoreEnumsAsStrings migration), so the
 * JSON on the wire carries "Open", never 0. A numeric enum here would compile
 * happily and then never match anything at runtime.
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

/**
 * The session layer widens UserRole with "" for "signed out or unrecognised".
 * normalizeRole() in session.service.ts returns this, not UserRole.
 */
export type SessionRole = UserRole | "";
