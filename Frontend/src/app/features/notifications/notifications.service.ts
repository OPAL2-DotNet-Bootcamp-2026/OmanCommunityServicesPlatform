import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { type Observable, map, tap } from "rxjs";
import { apiEndpoints } from "../../core/api/api-endpoints";
import { type Notification } from "../../core/models/notification.model";
import { asArray } from "../../core/utils/optional-requests.util";

/**
 * The signed-in user's notifications, and the unread count the header shows.
 * Any page that loads or marks notifications updates the count here.
 */
@Injectable({ providedIn: "root" })
export class NotificationsService {
  private readonly http = inject(HttpClient);

  /** Unread notifications for the header badge; null until known or when it failed. */
  readonly unreadCount = signal<number | null>(null);

  /** All notifications, newest first. The API answers 204 (null) when there are none. */
  getAll(): Observable<Notification[]> {
    return this.http.get<Notification[] | null>(apiEndpoints.myNotifications).pipe(
      map((value) => asArray<Notification>(value)),
      tap((notifications) => this.unreadCount.set(notifications.filter((item) => !item.isRead).length))
    );
  }

  getUnread(): Observable<Notification[]> {
    return this.http.get<Notification[] | null>(apiEndpoints.unreadNotifications).pipe(
      map((value) => asArray<Notification>(value))
    );
  }

  markRead(notificationId: number): Observable<void> {
    return this.http.patch<void>(apiEndpoints.markNotificationRead(notificationId), null).pipe(
      tap(() => this.unreadCount.update((count) => (count ? count - 1 : count)))
    );
  }

  /** Refreshes the header badge. A failure hides the badge; it never blocks the page. */
  refreshUnreadCount(): void {
    this.getUnread().subscribe({
      next: (notifications) => this.unreadCount.set(notifications.length),
      error: () => this.unreadCount.set(null)
    });
  }
}
