/**
 * Member 2 - convert from scripts/pages/register.js (101 lines).
 *
 * Sibling of login.page.ts; do them together, they share most of their shape.
 *
 * On success it sets a flash message and sends the user to login rather than
 * signing them straight in - setFlash/consumeFlash on SessionService is how
 * the message survives the navigation.
 */
import type { AuthService } from "../services/auth.service";
import type { SessionService } from "../services/session.service";

export class RegisterPage {
  constructor(
    protected readonly auth: AuthService,
    protected readonly session: SessionService
  ) {}

  start(): void {
    throw new Error("RegisterPage.start - Member 2, from scripts/pages/register.js");
  }
}
