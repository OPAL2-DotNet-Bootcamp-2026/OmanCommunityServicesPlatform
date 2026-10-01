import { Component, type OnInit, computed, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { ApiError, errorMessage } from "../../../core/api/api-error";
import { SessionService } from "../../../core/auth/session.service";
import { type Notification } from "../../../core/models/notification.model";
import { AppPaths } from "../../../core/routing/app-paths";
import { LoadingSkeletonComponent } from "../../../shared/components/loading-skeleton/loading-skeleton.component";
import { type StatusMessage, StatusAlertComponent } from "../../../shared/components/status-alert/status-alert.component";
import { CountUpDirective } from "../../../shared/directives/count-up.directive";
import { RevealOnEnterDirective } from "../../../shared/directives/reveal-on-enter.directive";
import { ToastService } from "../../../shared/services/toast.service";
import { NotificationListComponent } from "../notification-list/notification-list.component";
import { NotificationsService } from "../notifications.service";

/** Every notification for the signed-in user. Opening one marks it read, then goes to its issue. */
@Component({
  selector: "ocsp-notifications-page",
  imports: [RouterLink, LoadingSkeletonComponent, StatusAlertComponent, CountUpDirective, RevealOnEnterDirective, NotificationListComponent],
  templateUrl: "./notifications-page.component.html",
  styleUrl: "./notifications-page.component.css"
})
export class NotificationsPageComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly paths = AppPaths;
  protected readonly role = computed(() => this.session.currentUser()?.role ?? "");
  protected readonly notifications = signal<Notification[] | null>(null);
  protected readonly loadError = signal("");
  protected readonly status = signal<StatusMessage | null>(null);
  protected readonly unread = computed(() => (this.notifications() ?? []).filter((item) => !item.isRead).length);
  /** Notifications being marked read right now, so a double click sends one request. */
  private readonly pending = new Set<number>();

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.status.set(null);
    this.loadError.set("");
    this.notifications.set(null);
    this.notificationsService.getAll().subscribe({
      next: (notifications) => this.notifications.set(notifications),
      error: (error: unknown) => {
        const message = errorMessage(error, "The notifications could not be loaded.");
        this.loadError.set(message);
        this.toast.error(message, { announce: false });
      }
    });
  }

  /** Marks it read, then opens its issue. Opening never waits on a failed write. */
  protected open({ notification, href }: { notification: Notification; href: string }): void {
    const id = Number(notification.notificationId);
    const follow = (): void => {
      if (href) void this.router.navigateByUrl(href);
    };
    if (notification.isRead) {
      follow();
      return;
    }
    if (this.pending.has(id)) return;
    this.pending.add(id);

    this.notificationsService.markRead(id).subscribe({
      next: () => {
        this.pending.delete(id);
        this.notifications.update((list) => list?.map((item) => (item.notificationId === id ? { ...item, isRead: true } : item)) ?? null);
        // Following a link leaves the page, so a toast there would never be seen.
        if (!href) this.toast.success("Notification marked as read.");
        follow();
      },
      error: (error: unknown) => {
        this.pending.delete(id);
        const authorizationError = error instanceof ApiError && [401, 403].includes(error.status);
        if (authorizationError || !href) {
          const fallback = authorizationError ? "Your session could not be verified." : "The notification could not be marked as read.";
          this.status.set({ text: errorMessage(error, fallback), tone: "danger" });
        }
        if (!authorizationError) follow();
      }
    });
  }
}
