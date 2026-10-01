import { provideHttpClient, withFetch, withInterceptors } from "@angular/common/http";
import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from "@angular/core";
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from "@angular/router";
import { appRoutes } from "./app.routes";
import { apiBaseUrlInterceptor } from "./core/api/api-base-url.interceptor";
import { apiErrorInterceptor } from "./core/api/api-error.interceptor";
import { authTokenInterceptor } from "./core/api/auth-token.interceptor";

/** Application-wide providers. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: "top", anchorScrolling: "enabled" })
    ),
    // Order matters: the base URL is added first so the other two can tell our API from other hosts.
    provideHttpClient(
      withFetch(),
      withInterceptors([apiBaseUrlInterceptor, authTokenInterceptor, apiErrorInterceptor])
    )
  ]
};
