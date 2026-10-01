/** In-app notifications (DTOs/NotificationDTOs.cs). */
import { type NotificationType } from "./enums";

export interface Notification {
  notificationId: number;
  userId: number;
  issueId: number | null;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}
