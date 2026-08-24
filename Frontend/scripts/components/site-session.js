(function initializeOcspSiteSession(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const sessionService = ocsp.sessionService;
  let redirecting = false;

  function initials(name) {
    const parts = String(name || "User").trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || "U";
  }

  function pageMode() {
    return global.document.body.dataset.authPage || "public";
  }

  function allowedPageRoles() {
    return String(global.document.body.dataset.allowedRoles || "")
      .split(/[\s,]+/)
      .map((role) => sessionService.normalizeRole(role))
      .filter(Boolean);
  }

  function navigate(target) {
    if (redirecting) {
      return;
    }
    redirecting = true;
    global.location.replace(target);
  }

  // The shell owns route protection so individual page controllers only need to
  // ask whether initialization may continue.
  function isPageAllowed() {
    if (!sessionService || redirecting) {
      return false;
    }

    const mode = pageMode();
    const currentSession = sessionService.getSession();
    if (mode === "guest" && currentSession) {
      navigate(sessionService.roleHome(currentSession.user.role));
      return false;
    }

    if (mode !== "protected") {
      return true;
    }

    if (!currentSession) {
      const returnTo = `${global.location.pathname}${global.location.search}${global.location.hash}`;
      navigate(sessionService.loginUrl(returnTo));
      return false;
    }

    const roles = allowedPageRoles();
    if (roles.length && !roles.includes(currentSession.user.role)) {
      sessionService.setFlash({
        message: "Your account does not have access to that page.",
        tone: "warning"
      });
      navigate(sessionService.roleHome(currentSession.user.role));
      return false;
    }

    return true;
  }

  function updateRoleVisibility(user) {
    global.document.querySelectorAll("[data-role-visible]").forEach((element) => {
      const allowed = element.dataset.roleVisible
        .split(/[\s,]+/)
        .map((role) => sessionService.normalizeRole(role))
        .filter(Boolean);
      element.hidden = !user || !allowed.includes(user.role);
    });

    global.document.querySelectorAll("[data-nav-roles]").forEach((element) => {
      const allowed = element.dataset.navRoles
        .split(/[\s,]+/)
        .map((role) => sessionService.normalizeRole(role))
        .filter(Boolean);
      element.hidden = !user || !allowed.includes(user.role);
    });

    global.document.querySelectorAll("[data-nav-auth]").forEach((element) => {
      const requiresAuthentication = element.dataset.navAuth === "authenticated";
      element.hidden = requiresAuthentication ? !user : Boolean(user);
    });
  }

  function render() {
    if (!sessionService) {
      return;
    }

    const user = sessionService.getUser();
    global.document.querySelectorAll("[data-session-name]").forEach((element) => {
      element.textContent = user ? user.name : "Sign in";
    });
    global.document.querySelectorAll("[data-session-first-name]").forEach((element) => {
      element.textContent = user ? user.name.split(/\s+/)[0] : "Guest";
    });
    global.document.querySelectorAll("[data-session-avatar]").forEach((element) => {
      element.textContent = user ? initials(user.name) : "?";
    });
    global.document.querySelectorAll("[data-session-role]").forEach((element) => {
      element.textContent = user ? user.role : "Guest";
    });
    global.document.querySelectorAll("[data-session-control]").forEach((element) => {
      const icon = element.querySelector("[data-session-icon]");
      if (user) {
        element.dataset.action = "logout";
        element.href = sessionService.loginUrl("");
        element.setAttribute("aria-label", `Sign out ${user.name}`);
        if (icon) icon.className = "bi bi-box-arrow-right";
      } else {
        delete element.dataset.action;
        element.href = sessionService.loginUrl("");
        element.setAttribute("aria-label", "Sign in");
        if (icon) icon.className = "bi bi-box-arrow-in-right";
      }
    });

    updateRoleVisibility(user);
  }

  function bindLogout() {
    global.document.addEventListener("click", (event) => {
      const trigger = event.target.closest('[data-action="logout"]');
      if (!trigger || !sessionService) {
        return;
      }

      event.preventDefault();
      sessionService.clear("logout");
      global.location.assign(sessionService.loginUrl(""));
    });
  }

  global.addEventListener("ocsp:authorization-error", (event) => {
    if (!event.detail || event.detail.status !== 403 || !sessionService.getUser()) {
      return;
    }
    sessionService.setFlash({
      message: "You do not have permission to perform that action.",
      tone: "warning"
    });
    navigate(sessionService.roleHome(sessionService.getUser().role));
  });

  global.document.addEventListener("DOMContentLoaded", () => {
    if (!isPageAllowed()) {
      return;
    }
    render();
    bindLogout();
  });
  global.addEventListener("ocsp:session-changed", render);

  ocsp.siteSession = Object.freeze({ render, initials, isPageAllowed });
  global.OCSP = ocsp;
})(window);
