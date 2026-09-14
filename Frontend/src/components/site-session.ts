/**
 * The shared shell: the header account area, role-based visibility, and the
 * route guard that keeps a role off a page it may not see.
 *
 * This is the one component that reads and writes the live document, because it
 * owns the chrome around every page. The renderers stay pure; this does not.
 *
 * Pages declare their own protection in markup, which is what keeps the guard
 * generic:
 *   <body data-auth-page="protected" data-allowed-roles="Staff, Admin">
 *
 * Under Angular, isPageAllowed becomes a CanActivate guard and render becomes
 * a header component subscribing to the session.
 */
import type { SessionRole } from "../models";
import type { SessionService, SessionUser } from "../services/session.service";

export class SiteSession {
  /** Guards against a second navigate() while the first is still in flight. */
  private redirecting = false;

  constructor(private readonly session: SessionService) {}

  initials(name: string | null | undefined): string {
    const parts = String(name || "User")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase() || "U"
    );
  }

  private pageMode(): string {
    return document.body.dataset.authPage ?? "public";
  }

  private rolesFrom(value: string | undefined): SessionRole[] {
    return String(value ?? "")
      .split(/[\s,]+/)
      .map((role) => this.session.normalizeRole(role))
      .filter((role): role is Exclude<SessionRole, ""> => role !== "");
  }

  private navigate(target: string): void {
    if (this.redirecting) {
      return;
    }
    this.redirecting = true;
    window.location.replace(target);
  }

  /**
   * The shell owns route protection so page controllers only have to ask
   * whether initialisation may continue.
   */
  isPageAllowed(): boolean {
    if (this.redirecting) {
      return false;
    }

    const mode = this.pageMode();
    const currentSession = this.session.getSession();

    // A signed-in user has no business on login or register.
    if (mode === "guest" && currentSession) {
      this.navigate(this.session.roleHome(currentSession.user.role));
      return false;
    }

    if (mode !== "protected") {
      return true;
    }

    if (!currentSession) {
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      this.navigate(this.session.loginUrl(returnTo));
      return false;
    }

    const roles = this.rolesFrom(document.body.dataset.allowedRoles);
    if (roles.length && !roles.includes(currentSession.user.role)) {
      this.session.setFlash({
        message: "Your account does not have access to that page.",
        tone: "warning"
      });
      this.navigate(this.session.roleHome(currentSession.user.role));
      return false;
    }

    return true;
  }

  private updateRoleVisibility(user: SessionUser | null): void {
    document.querySelectorAll<HTMLElement>("[data-role-visible]").forEach((element) => {
      const allowed = this.rolesFrom(element.dataset.roleVisible);
      element.hidden = !user || !allowed.includes(user.role);
    });

    // The inverse of data-role-visible, and not the same thing as listing the
    // other roles: this keeps the element for a signed-out visitor. "Report an
    // issue" is an invitation to anyone except the staff who resolve them.
    document.querySelectorAll<HTMLElement>("[data-role-hidden]").forEach((element) => {
      const denied = this.rolesFrom(element.dataset.roleHidden);
      element.hidden = user ? denied.includes(user.role) : false;
    });

    document.querySelectorAll<HTMLElement>("[data-nav-roles]").forEach((element) => {
      const allowed = this.rolesFrom(element.dataset.navRoles);
      element.hidden = !user || !allowed.includes(user.role);
    });

    document.querySelectorAll<HTMLElement>("[data-nav-auth]").forEach((element) => {
      const requiresAuthentication = element.dataset.navAuth === "authenticated";
      element.hidden = requiresAuthentication ? !user : Boolean(user);
    });
  }

  /** Paints the header account area from the current session. */
  render = (): void => {
    const user = this.session.getUser();

    document.querySelectorAll<HTMLElement>("[data-session-name]").forEach((element) => {
      element.textContent = user ? user.name : "Sign in";
    });
    document.querySelectorAll<HTMLElement>("[data-session-first-name]").forEach((element) => {
      element.textContent = user ? (user.name.split(/\s+/)[0] ?? user.name) : "Guest";
    });
    document.querySelectorAll<HTMLElement>("[data-session-avatar]").forEach((element) => {
      element.textContent = user ? this.initials(user.name) : "?";
    });
    document.querySelectorAll<HTMLElement>("[data-session-role]").forEach((element) => {
      element.textContent = user ? user.role : "Guest";
    });

    document
      .querySelectorAll<HTMLAnchorElement>("[data-session-control]")
      .forEach((element) => {
        const icon = element.querySelector<HTMLElement>("[data-session-icon]");
        element.href = this.session.loginUrl("");
        if (user) {
          element.dataset.action = "logout";
          element.setAttribute("aria-label", `Sign out ${user.name}`);
          if (icon) icon.className = "bi bi-box-arrow-right";
        } else {
          delete element.dataset.action;
          element.setAttribute("aria-label", "Sign in");
          if (icon) icon.className = "bi bi-box-arrow-in-right";
        }
      });

    this.updateRoleVisibility(user);

    // Reveals the auth-dependent chrome now that it has been set correctly.
    // Until this class lands the stylesheet keeps it invisible, which is what
    // stops a signed-in visitor seeing "Sign In" flash past.
    document.body.classList.add("ocsp-session-ready");
  };

  private bindLogout(): void {
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const trigger = event.target.closest('[data-action="logout"]');
      if (!trigger) {
        return;
      }

      event.preventDefault();
      this.session.clear("logout");
      // Sign-out lands on the login page, which otherwise looks identical to
      // having been bounced there by an expired session.
      this.session.setFlash({ message: "Signed out successfully.", tone: "success" });
      window.location.assign(this.session.loginUrl(""));
    });
  }

  /**
   * Runs the guard, then paints the shell. Returns false when the page is being
   * redirected away, so the caller knows not to start the page controller.
   */
  start(): boolean {
    if (!this.isPageAllowed()) {
      return false;
    }
    this.render();
    this.bindLogout();
    window.addEventListener("ocsp:session-changed", this.render);
    return true;
  }
}
