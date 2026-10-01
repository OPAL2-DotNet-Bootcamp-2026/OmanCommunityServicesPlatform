import { Injectable, computed, inject, signal } from "@angular/core";
import { Router, type UrlTree } from "@angular/router";
import { APP_CONFIG } from "../config/app-config.token";
import { type SessionRole } from "../models/enums";
import { type LoginResponse, type User } from "../models/user.model";
import { AppPaths, PAGE_ROLES } from "../routing/app-paths";
import { asText, isRecord } from "../utils/text-coercion.util";

/** The session's own view of a user: the DTO plus the department name. */
export interface SessionUser extends Omit<User, "registrationDate"> {
  departmentName: string | null;
}

export interface Session {
  token: string;
  user: SessionUser;
  startedAt: string;
}

/** A one-time message carried to the next page ("Signed in successfully"). */
export interface Flash {
  message: string;
  tone: string;
  /** Prefills the login form after registering. */
  email: string;
  createdAt: number;
}

/** Navigation announcements expire; a registration email handoff does not. */
const FLASH_MAX_AGE_MS = 15_000;

/**
 * The signed-in user, their JWT, and the rules for where they may go. Stored in
 * sessionStorage, so closing the tab signs out; in memory if storage is blocked.
 */
@Injectable({ providedIn: "root" })
export class SessionService {
  private readonly router = inject(Router);
  private readonly storageKey = inject(APP_CONFIG).sessionStorageKey;
  private readonly flashStorageKey = `${this.storageKey}.flash`;

  private readonly state = signal<Session | null>(this.readStoredSession());
  private memoryFlash: Flash | null = null;
  /** Several requests can 401 at once; only the first one redirects. */
  private expiredRedirectStarted = false;

  /** The signed-in user, for templates. Null when signed out. */
  readonly currentUser = computed(() => this.state()?.user ?? null);

  /** The current session, or null if there is none or its token has expired. */
  getSession(): Session | null {
    const session = this.state();
    if (!session) {
      return null;
    }
    if (!session.token || this.isExpired(session.token)) {
      this.clear();
      return null;
    }
    return session;
  }

  getUser(): SessionUser | null {
    return this.getSession()?.user ?? null;
  }

  accessToken(): string {
    return this.getSession()?.token ?? "";
  }

  /** Throws if the sign-in response carries no token or no usable profile. */
  start(loginResult: LoginResponse): Session {
    const result: Record<string, unknown> = isRecord(loginResult) ? loginResult : {};
    const token = (asText(result["token"]) || asText(result["Token"])).trim();
    if (!token) {
      throw new Error("The sign-in response did not include an access token.");
    }

    const user = this.normalizeUser(isRecord(result["user"]) ? result["user"] : result);
    if (!user.userId || !user.role) {
      throw new Error("The sign-in response did not include a valid user profile.");
    }

    const session: Session = { token, user, startedAt: new Date().toISOString() };
    this.writeStorage(this.storageKey, session);
    this.state.set(session);
    this.expiredRedirectStarted = false;
    return session;
  }

  clear(): void {
    this.writeStorage(this.storageKey, null);
    this.state.set(null);
  }

  /** Called by the error interceptor on a 401: sign out once, then back through login. */
  handleExpiredSession(): void {
    const path = this.router.url.split("?")[0] ?? "";
    if (this.expiredRedirectStarted || path === AppPaths.login || path === AppPaths.register) {
      return;
    }
    this.expiredRedirectStarted = true;
    const returnTo = this.router.url;
    this.clear();
    this.setFlash({ message: "Your session expired. Sign in again.", tone: "warning" });
    void this.router.navigateByUrl(this.loginUrlTree(returnTo), { replaceUrl: true });
  }

  normalizeRole(value: unknown): SessionRole {
    const role = asText(value).trim().toLowerCase();
    if (role === "admin") return "Admin";
    if (role === "staff") return "Staff";
    if (role === "citizen") return "Citizen";
    return "";
  }

  hasRole(allowedRoles: readonly SessionRole[]): boolean {
    const user = this.getUser();
    return Boolean(user && allowedRoles.some((role) => this.normalizeRole(role) === user.role));
  }

  /** Where a role lands after signing in, or when sent away from a page it may not see. */
  roleHome(role: SessionRole): string {
    const normalized = this.normalizeRole(role);
    return normalized === "Admin" || normalized === "Staff" ? AppPaths.dashboard : AppPaths.myIssues;
  }

  /**
   * Validates a return-to target: same origin only, no scheme, no "//", no
   * backslash, a known page the role may open. Returns "" when rejected.
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
      const url = new URL(rawValue, window.location.origin);
      const path = url.pathname.replace(/\/+$/, "").toLowerCase() || AppPaths.home;
      const allowedRoles = PAGE_ROLES[path];
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

  /** /login, with ?returnTo= when the target is safe. */
  loginUrlTree(returnTo?: string | null): UrlTree {
    const safeTarget = this.safeReturnTo(returnTo);
    return this.router.createUrlTree([AppPaths.login], {
      queryParams: safeTarget ? { returnTo: safeTarget } : {}
    });
  }

  setFlash(value: Partial<Flash> | null): void {
    const flash: Flash | null = value
      ? {
          message: String(value.message ?? "").trim(),
          tone: String(value.tone ?? "info").trim(),
          email: String(value.email ?? "").trim(),
          createdAt: Date.now()
        }
      : null;
    this.memoryFlash = flash;
    this.writeStorage(this.flashStorageKey, flash);
  }

  /** Reads and removes the pending flash, unless it has gone stale. */
  consumeFlash(): Flash | null {
    const stored = this.readStorage<Flash>(this.flashStorageKey);
    if (stored) {
      this.memoryFlash = stored;
    }
    this.writeStorage(this.flashStorageKey, null);
    const flash = this.memoryFlash;
    this.memoryFlash = null;

    if (!flash || flash.email) return flash;
    const age = Date.now() - Number(flash.createdAt ?? 0);
    return age <= FLASH_MAX_AGE_MS ? flash : null;
  }

  private readStoredSession(): Session | null {
    const stored = this.readStorage<Session>(this.storageKey);
    return stored ? { ...stored, user: this.normalizeUser(stored.user) } : null;
  }

  private normalizeUser(value: unknown): SessionUser {
    const user: Record<string, unknown> = isRecord(value) ? value : {};
    return {
      userId: Number(user["userId"]) || 0,
      name: asText(user["name"], "User").trim() || "User",
      email: asText(user["email"]).trim(),
      phoneNumber: typeof user["phoneNumber"] === "string" ? user["phoneNumber"] : null,
      role: this.normalizeRole(user["role"]) as SessionUser["role"],
      regionId: Number(user["regionId"]) || null,
      departmentId: Number(user["departmentId"]) || null,
      departmentName: typeof user["departmentName"] === "string" ? user["departmentName"] : null,
      isActive: user["isActive"] !== false
    };
  }

  /** The payload of an untrusted token; unknown, so every reader must narrow it. */
  private decodeJwtPayload(token: string): unknown {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    try {
      const base64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  private isExpired(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    if (!isRecord(payload) || typeof payload["exp"] !== "number") {
      return true;
    }
    return payload["exp"] * 1000 <= Date.now();
  }

  /** Null when storage is unavailable (private mode, blocked site data) or the value is corrupt. */
  private readStorage<T>(key: string): T | null {
    try {
      const value = window.sessionStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: unknown): void {
    try {
      if (value === null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be blocked or full; the in-memory state still works.
    }
  }
}
