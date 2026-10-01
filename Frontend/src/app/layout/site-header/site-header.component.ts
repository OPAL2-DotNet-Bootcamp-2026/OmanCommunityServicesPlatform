import { Component, type ElementRef, computed, effect, inject, viewChild } from "@angular/core";
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from "@angular/router";
import { filter } from "rxjs";
import { SessionService } from "../../core/auth/session.service";
import { AppPaths } from "../../core/routing/app-paths";
import { NotificationsService } from "../../features/notifications/notifications.service";
import { InitialsPipe } from "../../shared/pipes/initials.pipe";
import { replayAnimation } from "../../shared/utils/reduced-motion.util";

/**
 * The top navigation on every page: role-aware links, the unread notification
 * count, and the account chip that signs in or out.
 */
@Component({
  selector: "ocsp-site-header",
  imports: [RouterLink, RouterLinkActive, InitialsPipe],
  templateUrl: "./site-header.component.html"
})
export class SiteHeaderComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  protected readonly notifications = inject(NotificationsService);

  protected readonly paths = AppPaths;
  protected readonly user = this.session.currentUser;
  protected readonly isCitizen = computed(() => this.user()?.role === "Citizen");
  protected readonly isStaff = computed(() => ["Staff", "Admin"].includes(this.user()?.role ?? ""));

  /** The CSS-only mobile menu is a checkbox; navigating closes it. */
  private readonly menuSwitch = viewChild<ElementRef<HTMLInputElement>>("menuSwitch");
  private readonly countBadge = viewChild<ElementRef<HTMLElement>>("countBadge");

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      const menuSwitch = this.menuSwitch()?.nativeElement;
      if (menuSwitch) menuSwitch.checked = false;
      if (this.session.getSession()) this.notifications.refreshUnreadCount();
    });

    // A short pulse when the unread count actually changes.
    effect(() => {
      const count = this.notifications.unreadCount();
      const badge = this.countBadge()?.nativeElement;
      if (badge && count) replayAnimation(badge, "ocsp-notification-pulse");
    });
  }

  protected unreadLabel(count: number): string {
    return `${count} unread notification${count === 1 ? "" : "s"}`;
  }

  protected signOut(event: Event): void {
    event.preventDefault();
    this.session.clear();
    this.notifications.unreadCount.set(null);
    this.session.setFlash({ message: "Signed out successfully.", tone: "success" });
    void this.router.navigateByUrl(AppPaths.login);
  }
}
