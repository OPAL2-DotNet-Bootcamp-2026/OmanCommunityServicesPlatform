/**
 * Member 2 - convert from scripts/services/session-service.js (332 lines).
 *
 * Convert this FIRST and commit it on its own: Members 1, 3 and 4 all import
 * it. It is the smallest slice by line count and the hardest by type
 * difficulty, which is why it is yours.
 *
 * The three interesting problems:
 *
 * 1. normalizeRole (session-service.js:18) takes anything and returns a closed
 *    set. Its return type is SessionRole - UserRole plus "" - not string. That
 *    union is what makes hasRole and roleHome checkable, so get it right here
 *    and three other files benefit.
 *
 * 2. decodeJwtPayload (:49) base64-decodes an untrusted string and JSON.parses
 *    it. The result is unknown, not an object. You have to narrow before
 *    reading .exp - this is the clearest example in the codebase of why
 *    unknown beats any.
 *
 * 3. getStorage (:41) returns null when sessionStorage throws, which it does in
 *    private mode and with site data blocked. Every caller already handles the
 *    null; keep the fallback to the in-memory session rather than typing the
 *    problem away with a non-null assertion.
 *
 * Also preserve the module-level side effects at the bottom of the JS: the
 * ocsp:authorization-error listener that clears on 401, and the restore() call
 * on load. In a class those belong in the constructor.
 */
import type { ApiClient } from "../core/api-client";
import type { AppConfig } from "../core/config";
import type { SessionRole, User } from "../models";

/** The session's own view of a user - normalizeUser() at session-service.js:26. */
export interface SessionUser extends User {
  departmentName: string | null;
}

export interface Session {
  token: string;
  user: SessionUser;
  startedAt: string;
}

export interface Flash {
  message: string;
  tone: string;
  email: string;
}

export class SessionService {
  constructor(
    protected readonly config: AppConfig,
    protected readonly api: ApiClient
  ) {}

  /** Throws if the login response carries no token or no valid profile. :136 */
  start(_loginResult: unknown): Session {
    throw new Error("SessionService.start - Member 2, from session-service.js:136");
  }

  getSession(): Session | null {
    throw new Error("SessionService.getSession - Member 2, from session-service.js:163");
  }

  getUser(): SessionUser | null {
    throw new Error("SessionService.getUser - Member 2, from session-service.js:167");
  }

  restore(): Session | null {
    throw new Error("SessionService.restore - Member 2, from session-service.js:172");
  }

  clear(_reason?: string): void {
    throw new Error("SessionService.clear - Member 2, from session-service.js:180");
  }

  /** Alias of clear(), kept because the pages call both names. */
  clearSession(_reason?: string): void {
    throw new Error("SessionService.clearSession - Member 2, alias of clear()");
  }

  isAuthenticated(): boolean {
    throw new Error("SessionService.isAuthenticated - Member 2, from session-service.js:313");
  }

  /** Accepts one role or a list. hasAnyRole is the same function. :188 */
  hasRole(_allowedRoles: SessionRole | SessionRole[]): boolean {
    throw new Error("SessionService.hasRole - Member 2, from session-service.js:188");
  }

  hasAnyRole(_allowedRoles: SessionRole | SessionRole[]): boolean {
    throw new Error("SessionService.hasAnyRole - Member 2, alias of hasRole()");
  }

  roleHome(_role: SessionRole): string {
    throw new Error("SessionService.roleHome - Member 2, from session-service.js:194");
  }

  /** Rejects off-site and role-inappropriate redirect targets. :201 */
  safeReturnTo(_value: string | null, _role?: SessionRole): string {
    throw new Error("SessionService.safeReturnTo - Member 2, from session-service.js:201");
  }

  loginUrl(_returnTo?: string | null): string {
    throw new Error("SessionService.loginUrl - Member 2, from session-service.js:272");
  }

  /** Redirects and returns null when there is no session or the role is wrong. :282 */
  requireSession(_allowedRoles?: SessionRole | SessionRole[]): Session | null {
    throw new Error("SessionService.requireSession - Member 2, from session-service.js:282");
  }

  setFlash(_value: Partial<Flash> | null): void {
    throw new Error("SessionService.setFlash - Member 2, from session-service.js:235");
  }

  consumeFlash(): Flash | null {
    throw new Error("SessionService.consumeFlash - Member 2, from session-service.js:254");
  }

  normalizeRole(_value: unknown): SessionRole {
    throw new Error("SessionService.normalizeRole - Member 2, from session-service.js:18");
  }
}
