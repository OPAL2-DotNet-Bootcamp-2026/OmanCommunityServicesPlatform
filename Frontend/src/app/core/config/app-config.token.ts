import { InjectionToken } from "@angular/core";
import { environment } from "../../../environments/environment";

/** Settings every part of the app may read; inject with inject(APP_CONFIG). */
export interface AppConfig {
  /** API origin without a trailing slash, e.g. http://localhost:5037. */
  readonly apiBaseUrl: string;
  readonly requestTimeoutMs: number;
  readonly locale: string;
  readonly timeZone: string;
  readonly sessionStorageKey: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>("APP_CONFIG", {
  providedIn: "root",
  factory: () =>
    Object.freeze({
      apiBaseUrl: environment.apiBaseUrl.replace(/\/+$/, ""),
      requestTimeoutMs: environment.requestTimeoutMs,
      locale: "en-OM",
      timeZone: "Asia/Muscat",
      sessionStorageKey: "ocsp.session"
    })
});
