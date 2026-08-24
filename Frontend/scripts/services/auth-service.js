(function initializeOcspAuthService(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const config = ocsp.config || {};
  const api = ocsp.apiClient;
  const session = ocsp.sessionService;
  const mockAccountKey = "ocsp.mock.accounts";

  function wait(milliseconds) {
    return new Promise((resolve) => global.setTimeout(resolve, milliseconds));
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function inferMockRole(email) {
    if (email.includes("admin")) return "Admin";
    if (email.includes("staff")) return "Staff";
    return "Citizen";
  }

  function displayNameFromEmail(email) {
    const localPart = email.split("@")[0] || "user";
    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "OCSP User";
  }

  function readMockAccounts() {
    try {
      return JSON.parse(global.localStorage.getItem(mockAccountKey) || "[]");
    } catch (_error) {
      return [];
    }
  }

  function saveMockAccounts(accounts) {
    try {
      global.localStorage.setItem(mockAccountKey, JSON.stringify(accounts));
    } catch (_error) {
      // Registration still completes for the current page when storage is blocked.
    }
  }

  function nextMockUserId(accounts) {
    const ids = accounts.map((account) => Number(account.userId)).filter(Number.isFinite);
    return ids.length ? Math.max(...ids, 1000) + 1 : 1001;
  }

  const mockSource = {
    async login(credentials) {
      await wait(250);
      const email = normalizeEmail(credentials.email);
      const password = String(credentials.password || "");
      if (!email || password.length < 6) {
        throw new Error("Enter a valid email and a password of at least 6 characters.");
      }

      const savedAccount = readMockAccounts().find(
        (account) => normalizeEmail(account.email) === email
      );
      const role = savedAccount ? savedAccount.role : inferMockRole(email);
      const user = savedAccount || {
        userId: role === "Admin" ? 1 : role === "Staff" ? 501 : 17,
        name: displayNameFromEmail(email),
        email,
        role,
        regionId: role === "Citizen" ? 1 : null,
        departmentId: role === "Staff" ? 11 : null,
        departmentName: role === "Staff" ? "Roads & Infrastructure" : null,
        isActive: true
      };

      return session.start({
        token: `mock.${role.toLowerCase()}.${Date.now()}`,
        ...user
      });
    },

    async register(payload) {
      await wait(250);
      const email = normalizeEmail(payload.email);
      const accounts = readMockAccounts();
      const currentMockUser = ocsp.mockData && ocsp.mockData.currentUser;
      const emailExists = accounts.some((account) => normalizeEmail(account.email) === email)
        || (currentMockUser && normalizeEmail(currentMockUser.email) === email);

      if (emailExists) {
        throw new Error("Email is already registered.");
      }

      const account = {
        userId: nextMockUserId(accounts),
        name: String(payload.name || "").trim(),
        email,
        phoneNumber: String(payload.phoneNumber || "").trim() || null,
        role: "Citizen",
        regionId: Number(payload.regionId) || null,
        departmentId: null,
        isActive: true
      };
      accounts.push(account);
      saveMockAccounts(accounts);
      return { ...account };
    },

    async getRegistrationRegions() {
      return Array.isArray(ocsp.mockData && ocsp.mockData.regions)
        ? ocsp.mockData.regions.map((region) => ({ ...region }))
        : [];
    }
  };

  const apiSource = {
    async login(credentials) {
      const response = await api.post(api.endpoints.login, {
        email: normalizeEmail(credentials.email),
        password: String(credentials.password || "")
      }, {
        auth: false,
        announceAuthorizationError: false
      });
      return session.start(response);
    },

    register(payload) {
      const request = {
        name: String(payload.name || "").trim(),
        email: normalizeEmail(payload.email),
        password: String(payload.password || ""),
        phoneNumber: String(payload.phoneNumber || "").trim() || null
      };
      const regionId = Number(payload.regionId);
      if (Number.isInteger(regionId) && regionId > 0) {
        request.regionId = regionId;
      }
      return api.post(api.endpoints.register, request, {
        auth: false,
        announceAuthorizationError: false
      });
    },

    async getRegistrationRegions() {
      // Region lookup requires authentication in the current backend. A deployment
      // can provide safe, preloaded choices without changing this page controller.
      const values = global.OCSP_RUNTIME_CONFIG
        && global.OCSP_RUNTIME_CONFIG.registrationRegions;
      return Array.isArray(values) ? values.map((region) => ({ ...region })) : [];
    }
  };

  function source() {
    const sources = { mock: mockSource, api: apiSource };
    const selected = sources[config.dataSource];
    if (!selected) {
      throw new Error(`Unknown frontend data source: ${config.dataSource}`);
    }
    return selected;
  }

  ocsp.authService = Object.freeze({
    login: (...args) => source().login(...args),
    register: (...args) => source().register(...args),
    getRegistrationRegions: (...args) => source().getRegistrationRegions(...args),
    logout: () => session.clear("logout")
  });

  global.OCSP = ocsp;
})(window);
