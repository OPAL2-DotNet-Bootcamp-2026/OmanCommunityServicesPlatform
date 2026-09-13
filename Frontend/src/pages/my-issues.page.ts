/**
 * Member 3 - convert from scripts/pages/my-issues.js (856 lines).
 *
 * The second-largest file. Do it last in your slice, after issue-renderers and
 * data.service, and convert it in sections rather than in one sitting - the
 * function list below is roughly the order they appear.
 *
 * Where the real typing work is:
 *
 *   - 56 DOM lookups cached into an elements object at my-issues.js:48. Type
 *     that object as a named interface with a field per handle, rather than
 *     Record<string, HTMLElement>. It is more typing up front and it is the
 *     thing that makes the other 800 lines check themselves.
 *
 *   - state.filters is indexed by key at :426 and :710. Give it the FilterKey
 *     union from MIGRATION.md rather than string, or every assignment goes
 *     unchecked.
 *
 *   - the only window.bootstrap use in the codebase, at :450 and :588.
 *     src/types/globals.d.ts already declares it as optional, so keep the
 *     existing "if (window.bootstrap && window.bootstrap.Modal)" guards - the
 *     pages that do not load the CDN bundle depend on them.
 *
 *   - captureCurrentLocation at :671 uses the Geolocation API, whose callbacks
 *     are typed as GeolocationPosition and GeolocationPositionError. Both are
 *     real DOM types; do not hand-roll them.
 */
import type { DataService } from "../services/data.service";
import type { SessionService } from "../services/session.service";

export class MyIssuesPage {
  constructor(
    protected readonly data: DataService,
    protected readonly session: SessionService
  ) {}

  start(): void {
    throw new Error("MyIssuesPage.start - Member 3, from scripts/pages/my-issues.js:829");
  }
}
