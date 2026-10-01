import { type Routes } from "@angular/router";
import { guestOnlyGuard, signedInGuard } from "./core/auth/auth.guard";
import { HELP_STRIPS } from "./core/routing/help-strip-content";
import { type PageRouteData } from "./core/routing/page-route-data";

const TITLE_SUFFIX = " | Oman Community Services Platform";

/**
 * Every page of the site. Each page is loaded only when first visited
 * (loadComponent), so the dashboard's code never ships to a citizen.
 * Paths match core/routing/app-paths.ts; `data` is a PageRouteData.
 */
export const appRoutes: Routes = [
  {
    path: "",
    pathMatch: "full",
    title: `Home${TITLE_SUFFIX}`,
    loadComponent: () => import("./features/home/home-page/home-page.component").then((m) => m.HomePageComponent),
    data: { helpStrip: HELP_STRIPS.home } satisfies PageRouteData
  },
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
  },
  {
    path: "my-issues",
    title: `My Issues${TITLE_SUFFIX}`,
    canActivate: [signedInGuard],
    loadComponent: () =>
      import("./features/citizen-issues/my-issues-page/my-issues-page.component").then((m) => m.MyIssuesPageComponent),
    data: { roles: ["Citizen"], bodyClass: "ocsp-portal ocsp-portal--citizen", helpStrip: HELP_STRIPS.citizenIssues } satisfies PageRouteData
  },
  {
    path: "notifications",
    title: `Notifications${TITLE_SUFFIX}`,
    canActivate: [signedInGuard],
    loadComponent: () =>
      import("./features/notifications/notifications-page/notifications-page.component").then((m) => m.NotificationsPageComponent),
    data: { roles: ["Citizen", "Staff", "Admin"], helpStrip: HELP_STRIPS.notifications } satisfies PageRouteData
  },
  // An unknown address goes home rather than to a blank page.
  { path: "**", redirectTo: "" }
];
