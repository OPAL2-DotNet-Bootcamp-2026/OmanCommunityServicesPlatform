/**
 * Member 3 - convert from scripts/pages/home.js (33 lines).
 *
 * The smallest page in the codebase. Do this one first to get the page shape
 * into your hands before you open my-issues.
 *
 * All it does is fetch the unread notification count and paint a badge, and
 * its notable quality is that a failure is not an error: the catch sets the
 * badge to hidden and carries on, because a count outage must never block
 * navigation on the landing page. Keep that.
 */
import type { DataService } from "../services/data.service";
import type { SessionService } from "../services/session.service";

export class HomePage {
  constructor(
    protected readonly data: DataService,
    protected readonly session: SessionService
  ) {}

  start(): void {
    throw new Error("HomePage.start - Member 3, from scripts/pages/home.js:10");
  }
}
