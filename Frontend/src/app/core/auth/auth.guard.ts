/**
 * Route guards. A page declares who may see it in app.routes.ts:
 *   { path: "dashboard", canActivate: [signedInGuard], data: { roles: ["Staff", "Admin"] } }
 */
import { inject } from "@angular/core";
import { type CanActivateFn, Router } from "@angular/router";
import { type SessionRole } from "../models/enums";
import { SessionService } from "./session.service";

/** Signed-in users only; route.data.roles, when present, narrows it to those roles. */
export const signedInGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const current = session.getSession();

  if (!current) {
    return session.loginUrlTree(state.url);
  }

  const roles = (route.data["roles"] as SessionRole[] | undefined) ?? [];
  if (roles.length && !session.hasRole(roles)) {
    session.setFlash({ message: "Your account does not have access to that page.", tone: "warning" });
    return router.parseUrl(session.roleHome(current.user.role));
  }
  return true;
};

/** Sign-in and registration: a signed-in user is sent to their own home page. */
export const guestOnlyGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const current = session.getSession();
  return current ? inject(Router).parseUrl(session.roleHome(current.user.role)) : true;
};
