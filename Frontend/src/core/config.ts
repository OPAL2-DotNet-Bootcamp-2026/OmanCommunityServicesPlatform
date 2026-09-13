/**
 * Member 1 - convert from scripts/config.js (28 lines).
 *
 * MIGRATION.md has the complete before/after for this file as its worked
 * example. Read it, then delete the throw below and paste your version in.
 *
 * The one change from the JavaScript: read import.meta.env.VITE_API_BASE_URL
 * first, and fall back to window.OCSP_RUNTIME_CONFIG. The env var is the
 * environment.ts equivalent and is what Angular will use later.
 */

export interface AppRoutes {
  readonly anonymousHome: string;
  readonly login: string;
  readonly citizenHome: string;
  readonly staffHome: string;
  readonly adminHome: string;
}

export interface AppConfig {
  readonly apiBaseUrl: string;
  readonly requestTimeoutMs: number;
  readonly locale: string;
  readonly timeZone: string;
  readonly sessionStorageKey: string;
  readonly routes: AppRoutes;
}

function notImplemented(): never {
  throw new Error("config.ts - Member 1 converts this from scripts/config.js");
}

export const config: AppConfig = notImplemented();
