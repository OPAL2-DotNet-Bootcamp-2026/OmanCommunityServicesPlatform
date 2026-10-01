import { type Routes } from "@angular/router";
import { guestOnlyGuard } from "./core/auth/auth.guard";

const TITLE_SUFFIX = " | Oman Community Services Platform";

/**
 * Every page of the site. Each page is loaded only when first visited
 * (loadComponent), so the dashboard's code never ships to a citizen.
 * Paths match core/routing/app-paths.ts.
 */
export const appRoutes: Routes = [
  {
    path: "login",
    title: `Sign In${TITLE_SUFFIX}`,
    canActivate: [guestOnlyGuard],
    loadComponent: () => import("./features/auth/login-page/login-page.component").then((m) => m.LoginPageComponent)
  },
  {
    path: "register",
    title: `Create Account${TITLE_SUFFIX}`,
    canActivate: [guestOnlyGuard],
    loadComponent: () => import("./features/auth/register-page/register-page.component").then((m) => m.RegisterPageComponent)
  }
];
