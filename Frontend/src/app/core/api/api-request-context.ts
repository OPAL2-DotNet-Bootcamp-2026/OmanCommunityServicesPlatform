import { HttpContext, HttpContextToken } from "@angular/common/http";

/**
 * Marks sign-in and registration. Their 401 means "wrong password", not
 * "session expired", so it must not sign the user out and redirect.
 */
export const IS_SIGN_IN_REQUEST = new HttpContextToken<boolean>(() => false);

export function signInRequestContext(): HttpContext {
  return new HttpContext().set(IS_SIGN_IN_REQUEST, true);
}
