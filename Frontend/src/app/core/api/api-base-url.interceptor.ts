import { type HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { APP_CONFIG } from "../config/app-config.token";

/** Turns "/issue/Create" into "http://localhost:5037/issue/Create"; absolute URLs pass through. */
export const apiBaseUrlInterceptor: HttpInterceptorFn = (request, next) => {
  if (/^https?:\/\//i.test(request.url)) {
    return next(request);
  }
  const { apiBaseUrl } = inject(APP_CONFIG);
  return next(request.clone({ url: `${apiBaseUrl}/${request.url.replace(/^\/+/, "")}` }));
};
