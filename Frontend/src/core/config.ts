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
 * Port 5037, because launchSettings.json binds it under BOTH launch profiles:
 *
 *   http   ->  http://localhost:5037
 *   https  ->  https://localhost:7130;http://localhost:5037
 *
 * 7130 exists only under the https profile, so defaulting to it means the app
 * cannot reach the API whenever someone runs the http one - which surfaces as
 * "The server could not be reached", with nothing to say it was the port.
 * 5037 works either way, and needs no dev certificate.
 *
 * Override with VITE_API_BASE_URL in .env.local to point at a deployed API.
 */
const DEFAULT_API_BASE_URL = "http://localhost:5037";

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
