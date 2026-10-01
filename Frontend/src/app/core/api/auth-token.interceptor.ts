import { type HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { SessionService } from "../auth/session.service";
import { APP_CONFIG } from "../config/app-config.token";

/**
 * Adds "Authorization: Bearer <jwt>" to calls to OUR API only. Other hosts
 * (OpenStreetMap's geocoder) must never receive the citizen's token.
 */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const { apiBaseUrl } = inject(APP_CONFIG);
  const token = inject(SessionService).accessToken();
  if (!token || !request.url.startsWith(`${apiBaseUrl}/`)) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
