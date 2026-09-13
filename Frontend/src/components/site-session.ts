/**
 * Member 2 - convert from scripts/components/site-session.js (153 lines).
 *
 * The shared shell: the header account area, role-based visibility, and the
 * guard that bounces a user off a page their role may not see.
 *
 * This is the one component that is NOT pure - it reads and writes the live
 * document, because it owns the chrome around every page. That is fine and
 * deliberate; just do not let the same habit leak into the renderers.
 *
 * render() and bindLogout() touch the DOM, so they return void. isPageAllowed()
 * is a predicate on the current URL. The private helpers (pageMode,
 * allowedPageRoles, navigate, updateRoleVisibility, bindLogout) stay
 * module-private - only three names are exported.
 */

export function initials(_name: string): string {
  throw new Error("initials - Member 2, from site-session.js:8");
}

/** True when the signed-in role may view the current page. site-session.js:34 */
export function isPageAllowed(): boolean {
  throw new Error("isPageAllowed - Member 2, from site-session.js:34");
}

/** Paints the header account area and applies role visibility. :92 */
export function render(): void {
  throw new Error("render - Member 2, from site-session.js:92");
}
