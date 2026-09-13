/**
 * Member 2 - convert from scripts/pages/login.js (101 lines).
 *
 * Form handling, which means this is where you meet the DOM-typing recipes in
 * MIGRATION.md for real. The form fields are HTMLInputElement, the submit
 * handler gets a SubmitEvent, and event.target needs narrowing before use.
 *
 * Behaviour to preserve: on success it reads the role off the new session and
 * redirects via roleHome(), honouring a returnTo query parameter that
 * safeReturnTo() has already validated. A failed login shows the ApiError
 * message rather than a generic one.
 */
import type { AuthService } from "../services/auth.service";
import type { SessionService } from "../services/session.service";

export class LoginPage {
  constructor(
    protected readonly auth: AuthService,
    protected readonly session: SessionService
  ) {}

  start(): void {
    throw new Error("LoginPage.start - Member 2, from scripts/pages/login.js");
  }
}
