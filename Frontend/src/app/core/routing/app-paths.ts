/**
 * Every page address in one place, and who may open it. Links, guards and the
 * login return-to check all read from here, so a page is renamed in one spot.
 */
import { type SessionRole } from "../models/enums";

export const AppPaths = Object.freeze({
  home: "/",
  login: "/login",
  register: "/register",
  myIssues: "/my-issues",
  dashboard: "/dashboard",
  notifications: "/notifications",
  paymentResult: "/payment-result"
});

/**
 * Roles allowed on each page; [] means anyone, signed in or not. A path missing
 * here is never a valid return-to target after sign-in.
 */
export const PAGE_ROLES: Readonly<Record<string, readonly SessionRole[]>> = Object.freeze({
  [AppPaths.home]: [],
  [AppPaths.myIssues]: ["Citizen"],
  [AppPaths.dashboard]: ["Staff", "Admin"],
  [AppPaths.notifications]: ["Citizen", "Staff", "Admin"],
  [AppPaths.paymentResult]: ["Citizen"]
});
