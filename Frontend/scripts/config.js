(function initializeOcspConfig(global) {
  "use strict";

  const ocsp = global.OCSP || {};

  // Deployments may define window.OCSP_RUNTIME_CONFIG before this file loads.
  // Local development uses the backend HTTP profile configured in launchSettings.json.
  const runtime = global.OCSP_RUNTIME_CONFIG || {};
  const apiBaseUrl = String(runtime.apiBaseUrl || "http://localhost:5037")
    .replace(/\/+$/, "");

  ocsp.config = Object.freeze({
    apiBaseUrl,
    requestTimeoutMs: Number(runtime.requestTimeoutMs) || 12000,
    locale: "en-OM",
    timeZone: "Asia/Muscat",
    sessionStorageKey: "ocsp.session",
    routes: Object.freeze({
      anonymousHome: "home.html",
      login: "login.html",
      citizenHome: "my-issues.html",
      staffHome: "dashboard.html",
      adminHome: "dashboard.html"
    })
  });

  global.OCSP = ocsp;
})(window);
