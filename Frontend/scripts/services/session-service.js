(function initializeOcspSessionService(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const config = ocsp.config || {};
  const api = ocsp.apiClient;
  const storageKey = config.sessionStorageKey || "ocsp.session";
  const flashStorageKey = `${storageKey}.flash`;
  const allowedPageRoles = Object.freeze({
    "index.html": [],
    "my-issues.html": ["Citizen"],
    "dashboard.html": ["Staff", "Admin"],
    "notifications.html": ["Citizen", "Staff", "Admin"]
  });
  let memorySession = null;
  let memoryFlash = null;
  let authorizationRedirectStarted = false;

  function normalizeRole(value) {
    const role = String(value || "").trim().toLowerCase();
    if (role === "admin") return "Admin";
    if (role === "staff") return "Staff";
    if (role === "citizen") return "Citizen";
    return "";
  }

  function normalizeUser(value) {
    const user = value && typeof value === "object" ? value : {};
    return {
      userId: Number(user.userId) || 0,
      name: String(user.name || "User").trim() || "User",
      email: String(user.email || "").trim(),
      phoneNumber: user.phoneNumber || null,
      role: normalizeRole(user.role),
      regionId: Number(user.regionId) || null,
      departmentId: Number(user.departmentId) || null,
      departmentName: user.departmentName || null,
      isActive: user.isActive !== false
    };
  }

  function getStorage() {
    try {
      return global.sessionStorage;
    } catch (_error) {
      return null;
    }
  }

  function decodeJwtPayload(token) {
    if (!token) {
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    try {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
      return JSON.parse(global.atob(padded));
    } catch (_error) {
      return null;
    }
  }

  function isExpired(token) {
    const payload = decodeJwtPayload(token);
    return !payload || !payload.exp || payload.exp * 1000 <= Date.now();
  }

  function persist(session) {
    memorySession = session;
    const storage = getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(storageKey, JSON.stringify(session));
    } catch (_error) {
      // Memory fallback keeps the current page functional if storage is blocked.
    }
  }

  function removePersistedSession() {
    memorySession = null;
    const storage = getStorage();
    if (!storage) {
      return;
    }

    try {
      storage.removeItem(storageKey);
    } catch (_error) {
      // Clearing the in-memory token is still sufficient for this page.
    }
  }

  function readPersistedSession() {
    const storage = getStorage();
    if (storage) {
      try {
        const value = storage.getItem(storageKey);
        if (value) {
          memorySession = JSON.parse(value);
        }
      } catch (_error) {
        removePersistedSession();
      }
    }

    if (!memorySession) {
      return null;
    }

    if (!memorySession.token || isExpired(memorySession.token)) {
      clear("expired");
      return null;
    }

    return {
      ...memorySession,
      user: normalizeUser(memorySession.user)
    };
  }

  function announce(name, detail) {
    if (typeof global.CustomEvent !== "function") {
      return;
    }
    global.dispatchEvent(new global.CustomEvent(name, { detail }));
  }

  function start(loginResult) {
    const result = loginResult && typeof loginResult === "object" ? loginResult : {};
    const token = String(result.token || result.Token || "").trim();
    if (!token) {
      throw new Error("The sign-in response did not include an access token.");
    }

    const rawUser = result.user || result;
    const user = normalizeUser(rawUser);
    if (!user.userId || !user.role) {
      throw new Error("The sign-in response did not include a valid user profile.");
    }

    const session = {
      token,
      user,
      startedAt: new Date().toISOString()
    };

    persist(session);
    if (api) {
      api.setAccessToken(token);
    }
    announce("ocsp:session-changed", { session });
    return session;
  }

  function getSession() {
    return readPersistedSession();
  }

  function getUser() {
    const session = getSession();
    return session ? session.user : null;
  }

  function restore() {
    const session = getSession();
    if (api) {
      api.setAccessToken(session ? session.token : "");
    }
    return session;
  }

  function clear(reason) {
    removePersistedSession();
    if (api) {
      api.clearAccessToken();
    }
    announce("ocsp:session-changed", { session: null, reason: reason || "logout" });
  }

  function hasRole(allowedRoles) {
    const user = getUser();
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return Boolean(user && roles.map(normalizeRole).includes(user.role));
  }

  function roleHome(role) {
    const routes = config.routes || {};
    if (normalizeRole(role) === "Admin") return routes.adminHome || "dashboard.html";
    if (normalizeRole(role) === "Staff") return routes.staffHome || "dashboard.html";
    return routes.citizenHome || "my-issues.html";
  }

  function safeReturnTo(value, role) {
    const rawValue = String(value || "").trim();
    if (
      !rawValue
      || rawValue.length > 600
      || rawValue.includes("\\")
      || rawValue.startsWith("//")
      || /^[a-z][a-z\d+.-]*:/i.test(rawValue)
    ) {
      return "";
    }

    try {
      const url = new URL(rawValue, global.location.href);
      // A directory URL such as "/" is served by index.html.
      const pageName = url.pathname.split("/").pop().toLowerCase() || "index.html";
      const allowedRoles = allowedPageRoles[pageName];
      if (url.origin !== global.location.origin || !allowedRoles) {
        return "";
      }

      const normalizedRole = normalizeRole(role);
      if (normalizedRole && allowedRoles.length && !allowedRoles.includes(normalizedRole)) {
        return "";
      }
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (_error) {
      return "";
    }
  }

  function currentReturnTo() {
    return safeReturnTo(`${global.location.pathname}${global.location.search}${global.location.hash}`);
  }

  function setFlash(value) {
    const flash = value && typeof value === "object"
      ? {
          message: String(value.message || "").trim(),
          tone: String(value.tone || "info").trim(),
          email: String(value.email || "").trim()
        }
      : null;
    memoryFlash = flash;
    const storage = getStorage();
    if (storage && flash) {
      try {
        storage.setItem(flashStorageKey, JSON.stringify(flash));
      } catch (_error) {
        // The in-memory fallback is enough for navigation in the current document.
      }
    }
  }

  function consumeFlash() {
    const storage = getStorage();
    if (storage) {
      try {
        const stored = storage.getItem(flashStorageKey);
        if (stored) {
          memoryFlash = JSON.parse(stored);
        }
        storage.removeItem(flashStorageKey);
      } catch (_error) {
        // Fall back to the in-memory value.
      }
    }
    const flash = memoryFlash;
    memoryFlash = null;
    return flash;
  }

  function loginUrl(returnTo) {
    const routes = config.routes || {};
    const url = new URL(routes.login || "login.html", global.location.href);
    const safeTarget = safeReturnTo(returnTo);
    if (safeTarget) {
      url.searchParams.set("returnTo", safeTarget);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function requireSession(allowedRoles) {
    const session = getSession();
    if (!session) {
      global.location.replace(loginUrl(currentReturnTo()));
      return null;
    }

    if (allowedRoles && !hasRole(allowedRoles)) {
      global.location.replace(roleHome(session.user.role));
      return null;
    }

    return session;
  }

  // A 401 means the saved token is no longer usable. Clear it once and send the
  // user back through the normal login path while preserving their destination.
  global.addEventListener("ocsp:authorization-error", (event) => {
    if (
      authorizationRedirectStarted ||
      !event.detail ||
      event.detail.status !== 401
    ) {
      return;
    }

    const currentPage = global.location.pathname.split("/").pop().toLowerCase();
    if (["login.html", "register.html"].includes(currentPage)) {
      return;
    }

    authorizationRedirectStarted = true;
    clear("unauthorized");
    setFlash({
      message: "Your session expired. Sign in again.",
      tone: "warning"
    });
    global.location.replace(loginUrl(currentReturnTo()));
  });

  ocsp.sessionService = Object.freeze({
    start,
    getSession,
    getUser,
    restore,
    clear,
    clearSession: clear,
    isAuthenticated: () => Boolean(getSession()),
    hasRole,
    hasAnyRole: hasRole,
    roleHome,
    safeReturnTo,
    loginUrl,
    requireSession,
    setFlash,
    consumeFlash,
    normalizeRole
  });

  global.OCSP = ocsp;
  restore();
})(window);
