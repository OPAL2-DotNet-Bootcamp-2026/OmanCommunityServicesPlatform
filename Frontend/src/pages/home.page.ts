/**
 * Landing page. Its only behaviour is the unread notification badge, and a
 * failure there must never block navigation - the badge just hides itself.
 */
import { optionalById } from "../dom";
import type { DataService } from "../services/data.service";
import type { SessionService } from "../services/session.service";

export class HomePage {
  constructor(
    private readonly data: DataService,
    private readonly session: SessionService
  ) {}

  private async loadUnreadNotificationCount(): Promise<void> {
    const badge = optionalById<HTMLElement>("homeNotificationCount");
    if (!badge || !this.session.getUser()) {
      return;
    }

    try {
      const notifications = await this.data.getUnreadNotifications();
      const count = notifications.length;
      badge.textContent = String(count);
      badge.hidden = count === 0;
      badge.setAttribute(
        "aria-label",
        `${count} unread notification${count === 1 ? "" : "s"}`
      );
    } catch {
      badge.textContent = "0";
      badge.hidden = true;
      badge.setAttribute("aria-label", "Unread notification count unavailable");
    }
  }

  start(): void {
    void this.loadUnreadNotificationCount();
  }
}
