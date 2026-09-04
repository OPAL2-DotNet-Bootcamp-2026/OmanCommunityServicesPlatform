(function initializeOcspAuthService(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const api = ocsp.apiClient;
  const session = ocsp.sessionService;

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  // Authentication is API-only. The returned JWT is persisted by the shared
  // session service and automatically attached to later protected requests.
  async function login(credentials) {
    const response = await api.post(api.endpoints.login, {
      email: normalizeEmail(credentials.email),
      password: String(credentials.password || "")
    }, {
      auth: false,
      announceAuthorizationError: false
    });

    return session.start(response);
  }

  function register(payload) {
    // Region is intentionally omitted. The backend protects its region lookup,
    // while RegisterUserDto allows regionId to be null for anonymous sign-up.
    return api.post(api.endpoints.register, {
      name: String(payload.name || "").trim(),
      email: normalizeEmail(payload.email),
      password: String(payload.password || ""),
      phoneNumber: String(payload.phoneNumber || "").trim() || null,
      regionId: null
    }, {
      auth: false,
      announceAuthorizationError: false
    });
  }

  ocsp.authService = Object.freeze({
    login,
    register,
    logout: () => session.clear("logout")
  });

  global.OCSP = ocsp;
})(window);
