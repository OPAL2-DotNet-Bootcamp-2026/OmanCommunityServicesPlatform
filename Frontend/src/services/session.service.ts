/**
 * Session state: the JWT, the signed-in user, role checks, and the redirect
 * rules that keep a role off a page it may not see.
 *
 * Under Angular the role checks become a CanActivate guard and the
 * authorization-error listener becomes an HttpInterceptor.
 */
import type { ApiClient, AuthorizationErrorDetail } from "../core/api-client";
import type { AppConfig } from "../core/config";
import type { LoginResponse, SessionRole, User } from "../models";
import { asText } from "../text";

/** The session's own view of a user: the DTO plus the department name. */
export interface SessionUser extends Omit<User, "registrationDate"> {
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
  /** When the flash was set. See FLASH_MAX_AGE_MS. */
  createdAt: number;
}

/**
 * A flash describes the navigation that just happened - "you have signed in",
 * "that account cannot open this page". One still sitting in storage minutes
 * later has missed its moment, and announcing it then reads as a message about
 * whatever the reader is doing now. Long enough to survive a slow first load.
 */
const FLASH_MAX_AGE_MS = 15_000;

/**
 * Which roles may view which page. An empty array means "any role, including
 * signed out". A page absent from this map is never a valid redirect target.
 */
const ALLOWED_PAGE_ROLES: Record<string, SessionRole[]> = {
  "index.html": [],
  "my-issues.html": ["Citizen"],
  "dashboard.html": ["Staff", "Admin"],
  "notifications.html": ["Citizen", "Staff", "Admin"]
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}


/** A directory URL such as "/" is served by index.html. */
function currentPageName(): string {
  return (window.location.pathname.split("/").pop() ?? "").toLowerCase() || "index.html";
}

export class SessionService {
  private memorySession: Session | null = null;
  /**
   * A page can fire several requests at once, so a lapsed token produces
   * several 401s. Without this, each one starts its own redirect.
   */
  private authorizationRedirectStarted = false;
  private memoryFlash: Flash | null = null;
  private readonly storageKey: string;
  private readonly flashStorageKey: string;

  constructor(
    private readonly config: AppConfig,
    private readonly api: ApiClient
  ) {
    this.storageKey = config.sessionStorageKey || "ocsp.session";
    this.flashStorageKey = `${this.storageKey}.flash`;

    // A 401 means the stored token is no longer usable. Clear it once and send
    // the user back through login, preserving where they were heading.
    window.addEventListener("ocsp:authorization-error", (event) => {
      const detail = (event as CustomEvent<AuthorizationErrorDetail>).detail;
      if (this.authorizationRedirectStarted || !detail || detail.status !== 401) {
        return;
      }
      // Being bounced off login or register would be circular.
      if (["login.html", "register.html"].includes(currentPageName())) {
        return;
      }

      this.authorizationRedirectStarted = true;
      this.clear("unauthorized");
      this.setFlash({ message: "Your session expired. Sign in again.", tone: "warning" });
      window.location.replace(this.loginUrl(this.currentReturnTo()));
    });

    this.restore();
  }

  normalizeRole(value: unknown): SessionRole {
    const role = asText(value).trim().toLowerCase();
    if (role === "admin") return "Admin";
    if (role === "staff") return "Staff";
    if (role === "citizen") return "Citizen";
    return "";
  }

  private normalizeUser(value: unknown): SessionUser {
    const user: Record<string, unknown> = isRecord(value) ? value : {};
    return {
      userId: Number(user.userId) || 0,
      name: asText(user.name, "User").trim() || "User",
      email: asText(user.email).trim(),
      phoneNumber: typeof user.phoneNumber === "string" ? user.phoneNumber : null,
      role: this.normalizeRole(user.role) as SessionUser["role"],
      regionId: Number(user.regionId) || null,
      departmentId: Number(user.departmentId) || null,
      departmentName: typeof user.departmentName === "string" ? user.departmentName : null,
      isActive: user.isActive !== false
    };
  }

  /** Returns null when storage is unavailable - private mode, blocked site data. */
  private getStorage(): Storage | null {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  }

  /**
   * The payload of an untrusted token, so the result is unknown and every
   * caller has to narrow before reading it.
   */
  private decodeJwtPayload(token: string): unknown {
    if (!token) {
      return null;
    }
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    try {
      const base64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
      return JSON.parse(window.atob(padded));
    } catch {
      return null;
    }
  }

  private isExpired(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    if (!isRecord(payload) || typeof payload.exp !== "number") {
      return true;
    }
    return payload.exp * 1000 <= Date.now();
  }

  private persist(session: Session): void {
    this.memorySession = session;
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.setItem(this.storageKey, JSON.stringify(session));
    } catch {
      // The in-memory fallback keeps the current page working.
    }
  }

  private removePersistedSession(): void {
    this.memorySession = null;
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.removeItem(this.storageKey);
    } catch {
      // Clearing the in-memory token is sufficient for this page.
    }
  }

  private readPersistedSession(): Session | null {
    const storage = this.getStorage();
    if (storage) {
      try {
        const value = storage.getItem(this.storageKey);
        if (value) {
          this.memorySession = JSON.parse(value) as Session;
        }
      } catch {
        this.removePersistedSession();
      }
    }

    if (!this.memorySession) {
      return null;
    }

    if (!this.memorySession.token || this.isExpired(this.memorySession.token)) {
      this.clear("expired");
      return null;
    }

    return {
      ...this.memorySession,
      user: this.normalizeUser(this.memorySession.user)
    };
  }

  private announce(name: string, detail: unknown): void {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  /** Throws if the sign-in response carries no token or no usable profile. */
  start(loginResult: LoginResponse): Session {
    const result: Record<string, unknown> = isRecord(loginResult) ? loginResult : {};
    const token = (asText(result.token) || asText(result.Token)).trim();
    if (!token) {
      throw new Error("The sign-in response did not include an access token.");
    }

    const user = this.normalizeUser(isRecord(result.user) ? result.user : result);
    if (!user.userId || !user.role) {
      throw new Error("The sign-in response did not include a valid user profile.");
    }

    const session: Session = { token, user, startedAt: new Date().toISOString() };
    this.persist(session);
    this.api.setAccessToken(token);
    this.announce("ocsp:session-changed", { session });
    return session;
  }

  getSession(): Session | null {
    return this.readPersistedSession();
  }

  getUser(): SessionUser | null {
    return this.getSession()?.user ?? null;
  }

  /** Re-arms the API client with the stored token after a page navigation. */
  restore(): Session | null {
    const session = this.getSession();
    this.api.setAccessToken(session ? session.token : "");
    return session;
  }

  clear(reason = "logout"): void {
    this.removePersistedSession();
    this.api.clearAccessToken();
    this.announce("ocsp:session-changed", { session: null, reason });
  }

  /** Alias of clear(), kept because both names are called across the pages. */
  clearSession(reason = "logout"): void {
    this.clear(reason);
  }

  isAuthenticated(): boolean {
    return Boolean(this.getSession());
  }

  hasRole(allowedRoles: SessionRole | SessionRole[]): boolean {
    const user = this.getUser();
    if (!user) {
      return false;
    }
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.map((role) => this.normalizeRole(role)).includes(user.role);
  }

  /** Alias of hasRole(). */
  hasAnyRole(allowedRoles: SessionRole | SessionRole[]): boolean {
    return this.hasRole(allowedRoles);
  }

  roleHome(role: SessionRole): string {
    const routes = this.config.routes;
    const normalized = this.normalizeRole(role);
    if (normalized === "Admin") return routes.adminHome || "dashboard.html";
    if (normalized === "Staff") return routes.staffHome || "dashboard.html";
    return routes.citizenHome || "my-issues.html";
  }

  /**
   * Validates a redirect target. Rejects anything off-origin, protocol-relative,
   * scheme-bearing, backslash-containing, over-long, unknown to the page map, or
   * not permitted for the given role. Returns "" when rejected.
   */
  safeReturnTo(value: string | null | undefined, role?: SessionRole): string {
    const rawValue = String(value ?? "").trim();
    if (
      !rawValue ||
      rawValue.length > 600 ||
      rawValue.includes("\\") ||
      rawValue.startsWith("//") ||
      /^[a-z][a-z\d+.-]*:/i.test(rawValue)
    ) {
      return "";
    }

    try {
      const url = new URL(rawValue, window.location.href);
      const pageName = (url.pathname.split("/").pop() ?? "").toLowerCase() || "index.html";
      const allowedRoles = ALLOWED_PAGE_ROLES[pageName];
      if (url.origin !== window.location.origin || !allowedRoles) {
        return "";
      }

      const normalizedRole = this.normalizeRole(role);
      if (normalizedRole && allowedRoles.length && !allowedRoles.includes(normalizedRole)) {
        return "";
      }
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return "";
    }
  }

  private currentReturnTo(): string {
    return this.safeReturnTo(
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
  }

  loginUrl(returnTo?: string | null): string {
    const url = new URL(this.config.routes.login || "login.html", window.location.href);
    const safeTarget = this.safeReturnTo(returnTo);
    if (safeTarget) {
      url.searchParams.set("returnTo", safeTarget);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  /** Redirects and returns null when there is no session, or the role is wrong. */
  requireSession(allowedRoles?: SessionRole | SessionRole[]): Session | null {
    const session = this.getSession();
    if (!session) {
      window.location.replace(this.loginUrl(this.currentReturnTo()));
      return null;
    }

    if (allowedRoles && !this.hasRole(allowedRoles)) {
      window.location.replace(this.roleHome(session.user.role));
      return null;
    }

    return session;
  }

  setFlash(value: Partial<Flash> | null): void {
    const flash: Flash | null = isRecord(value)
      ? {
          message: String(value.message ?? "").trim(),
          tone: String(value.tone ?? "info").trim(),
          email: String(value.email ?? "").trim(),
          createdAt: Date.now()
        }
      : null;

    this.memoryFlash = flash;
    const storage = this.getStorage();
    if (storage && flash) {
      try {
        storage.setItem(this.flashStorageKey, JSON.stringify(flash));
      } catch {
        // In-memory is enough to survive navigation within this document.
      }
    }
  }

  /** Reads and removes the pending flash message, unless it has gone stale. */
  consumeFlash(): Flash | null {
    const storage = this.getStorage();
    if (storage) {
      try {
        const stored = storage.getItem(this.flashStorageKey);
        if (stored) {
          this.memoryFlash = JSON.parse(stored) as Flash;
        }
        storage.removeItem(this.flashStorageKey);
      } catch {
        // Fall back to the in-memory value.
      }
    }
    const flash = this.memoryFlash;
    this.memoryFlash = null;

    if (!flash) {
      return null;
    }

    // A flash carrying an email is not an announcement, it is a handoff:
    // registration puts the new account's address here for the sign-in form to
    // fill in. Losing that is worse than delivering it late, so it never
    // expires - a slow first load of login.html would otherwise drop both the
    // confirmation and the prefilled address.
    if (flash.email) {
      return flash;
    }

    // A flash written before createdAt existed has no age to check, so it is
    // treated as stale rather than shown late.
    const age = Date.now() - Number(flash.createdAt ?? 0);

    // A negative age means the clock moved backwards between writing and
    // reading - an NTP correction, or the user changing it. Deliver it: showing
    // a message slightly late beats swallowing it over a clock adjustment.
    return age <= FLASH_MAX_AGE_MS ? flash : null;
  }
}
