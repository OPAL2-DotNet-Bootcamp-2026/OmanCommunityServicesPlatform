/**
 * Landing page. Its only behaviour is the unread notification badge, and a
 * failure there must never block navigation - the badge just hides itself.
 */
import { optionalById, toTone } from "../dom";
import * as feedback from "../components/feedback";
import { pulse } from "../components/motion";
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
      // Only animates when the number actually changed.
      pulse(badge, count);
    } catch {
      badge.textContent = "0";
      badge.hidden = true;
      badge.setAttribute("aria-label", "Unread notification count unavailable");
    }
  }

  /**
   * A flash is set before a redirect, so it has to be consumed here too.
   * Otherwise a "signed in successfully" message set on the way out of login
   * would surface later on some unrelated portal page.
   */
  private showPendingFlash(): void {
    const flash = this.session.consumeFlash();
    if (flash?.message) {
      feedback.show(flash.message, { tone: toTone(flash.tone) });
    }
  }

  start(): void {
    this.showPendingFlash();
    void this.loadUnreadNotificationCount();
  }
}
