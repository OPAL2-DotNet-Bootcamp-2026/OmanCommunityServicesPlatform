/**
 * Application configuration.
 *
 * Precedence for the API address: the build-time env var, then a
 * deployment-injected global, then the local https launch profile.
 *
 * Under Angular this file becomes environments/environment.ts plus an
 * APP_CONFIG InjectionToken; the shape does not change.
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

const runtime = window.OCSP_RUNTIME_CONFIG ?? {};

/**
 * launchSettings.json binds https to 7130 and http to 5037, and
 * UseHttpsRedirection is skipped in Development, so both are live locally.
 *
 * https is the default because that is the profile the team runs. If the dev
 * certificate is not trusted on a machine, fetch fails with an opaque network
 * error - set VITE_API_BASE_URL=http://localhost:5037 in .env.local there, or
 * run `dotnet dev-certs https --trust` once.
 */
const DEFAULT_API_BASE_URL = "https://localhost:7130";

const apiBaseUrl = String(
  import.meta.env.VITE_API_BASE_URL || runtime.apiBaseUrl || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

/**
 * Pages live at different depths - index.html at the root, the rest under
 * pages/ - so a bare "login.html" resolves differently depending on where the
 * reader already is. Resolving against Vite's BASE_URL gives one absolute
 * answer from anywhere, and keeps working if the site is ever served from a
 * sub-path rather than the domain root.
 */
const frontendBase = new URL(import.meta.env.BASE_URL, window.location.origin);
const pageUrl = (path: string): string => new URL(path, frontendBase).href;

export const config: AppConfig = Object.freeze({
  apiBaseUrl,
  requestTimeoutMs: Number(runtime.requestTimeoutMs) || 12000,
  locale: "en-OM",
  timeZone: "Asia/Muscat",
  sessionStorageKey: "ocsp.session",
  routes: Object.freeze({
    anonymousHome: pageUrl("index.html"),
    login: pageUrl("pages/login.html"),
    citizenHome: pageUrl("pages/my-issues.html"),
    staffHome: pageUrl("pages/dashboard.html"),
    adminHome: pageUrl("pages/dashboard.html")
  })
});
