/**
 * Application configuration.
 *
 * Precedence: the build-time env var, then a deployment-injected global, then
 * the http launch profile of the Web API.
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

const apiBaseUrl = String(
  import.meta.env.VITE_API_BASE_URL || runtime.apiBaseUrl || "http://localhost:5037"
).replace(/\/+$/, "");

export const config: AppConfig = Object.freeze({
  apiBaseUrl,
  requestTimeoutMs: Number(runtime.requestTimeoutMs) || 12000,
  locale: "en-OM",
  timeZone: "Asia/Muscat",
  sessionStorageKey: "ocsp.session",
  routes: Object.freeze({
    anonymousHome: "home.html",
    login: "login.html",
    citizenHome: "my-issues.html",
    staffHome: "dashboard.html",
    adminHome: "dashboard.html"
  })
});
