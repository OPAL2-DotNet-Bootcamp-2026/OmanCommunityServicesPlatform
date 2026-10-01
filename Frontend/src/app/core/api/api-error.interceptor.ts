import { HttpErrorResponse, type HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { TimeoutError, catchError, throwError, timeout } from "rxjs";
import { SessionService } from "../auth/session.service";
import { APP_CONFIG } from "../config/app-config.token";
import { ApiError, apiErrorMessage, fallbackMessageFor } from "./api-error";
import { IS_SIGN_IN_REQUEST } from "./api-request-context";

/**
 * Every failed call to our API becomes an ApiError with a readable message:
 * timeouts, an unreachable server (naming the address so it can be checked),
 * and server errors. A 401 outside sign-in means the session expired.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const config = inject(APP_CONFIG);
  const session = inject(SessionService);
  if (!request.url.startsWith(`${config.apiBaseUrl}/`)) {
    return next(request);
  }

  return next(request).pipe(
    timeout(config.requestTimeoutMs),
    catchError((error: unknown) => {
      if (error instanceof TimeoutError) {
        return throwError(() => new ApiError("The request timed out. Please try again.", 0));
      }
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      if (error.status === 0) {
        return throwError(() => new ApiError(
          `The server at ${config.apiBaseUrl} could not be reached. Check that the API is running and that the address is right.`,
          0,
          error
        ));
      }

      if (error.status === 401 && !request.context.get(IS_SIGN_IN_REQUEST)) {
        session.handleExpiredSession();
      }

      const payload: unknown = error.error;
      return throwError(() => new ApiError(
        apiErrorMessage(payload, fallbackMessageFor(error.status)),
        error.status,
        { payload, retryAfter: error.headers.get("Retry-After") }
      ));
    })
  );
};
