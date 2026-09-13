/**
 * Member 4 - convert from scripts/pages/dashboard.js (1090 lines).
 *
 * The largest file in the codebase, but not the hardest: most of it is
 * repetitive DOM handling. Convert it in sections and commit as you go.
 *
 * Where the real typing work is:
 *
 *   - 46 DOM lookups cached at dashboard.js:66. Same advice as my-issues:
 *     a named interface with one field per handle, not a string-keyed record.
 *
 *   - state.filters indexed by key at :462. Use the FilterKey union.
 *
 *   - the focus trap at :776 to :860. focusableDialogElements returns a list
 *     of elements you then call .focus() on, so it must be HTMLElement[], not
 *     Element[] - Element has no focus(). This is the one place in the file
 *     where the right type is not the obvious one.
 *
 *   - three admin forms sharing one submit handler via adminPayload at :670.
 *     The payload shape differs per form, so this is a natural discriminated
 *     union keyed on the form's target - a good exercise, and better than
 *     widening the return type until it type-checks.
 *
 *   - hashchange and history handling at :925 and :59. The issue id comes out
 *     of the URL as a string and must be parsed; Number() on a bad hash gives
 *     NaN, which the existing code guards.
 */
import type { DashboardService } from "../services/dashboard.service";
import type { SessionService } from "../services/session.service";

export class DashboardPage {
  constructor(
    protected readonly dashboard: DashboardService,
    protected readonly session: SessionService
  ) {}

  start(): void {
    throw new Error("DashboardPage.start - Member 4, from scripts/pages/dashboard.js:1048");
  }
}
