/** Build-time API URL overrides runtime config, then the local HTTP default. */

interface AppRoutes {
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

/** Port 5037 is available in both backend launch profiles without a certificate. */
const DEFAULT_API_BASE_URL = "http://localhost:5037";

const apiBaseUrl = String(
  import.meta.env.VITE_API_BASE_URL || runtime.apiBaseUrl || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

/** Resolve pages consistently across nested pages and sub-path deployments. */
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
