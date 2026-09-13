/**
 * Member 1 - convert from scripts/pages/notifications.js (185 lines).
 * Your PR B, after models and core.
 *
 * Lists notifications, groups them by day, and marks them read. The read
 * toggle updates local state and re-renders immediately rather than refetching
 * the list - keep that, it is what makes the page feel instant.
 */
import type { DataService } from "../services/data.service";
import type { SessionService } from "../services/session.service";

export class NotificationsPage {
  constructor(
    protected readonly data: DataService,
    protected readonly session: SessionService
  ) {}

  start(): void {
    throw new Error("NotificationsPage.start - Member 1, from scripts/pages/notifications.js");
  }
}
