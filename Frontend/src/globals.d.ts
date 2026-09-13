/**
 * Ambient declarations for globals the pages rely on but do not import.
 *
 * When the app moves to Angular both of these disappear: Bootstrap becomes
 * ng-bootstrap components, and the runtime config becomes environment.ts.
 */
import type * as bootstrap from "bootstrap";

/** Shape a deployment may inject before the page scripts load. */
interface OcspRuntimeConfig {
  apiBaseUrl?: string;
  requestTimeoutMs?: number;
}

declare global {
  interface Window {
    /**
     * Optional deployment override read by core/config.ts. The Vite env var
     * VITE_API_BASE_URL takes precedence; this is the fallback for hosts that
     * cannot rebuild the bundle.
     */
    OCSP_RUNTIME_CONFIG?: OcspRuntimeConfig;

    /**
     * Installed by the Bootstrap bundle loaded from the CDN in my-issues.html.
     * Typed by @types/bootstrap. Optional because the pages that do not load
     * the bundle must still compile, which is why the existing code guards
     * every use with `if (window.bootstrap && window.bootstrap.Modal)`.
     */
    bootstrap?: typeof bootstrap;
  }
}

export {};
