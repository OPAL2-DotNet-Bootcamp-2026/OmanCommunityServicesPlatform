(function initializeOcspConfig(global) {
  "use strict";

  const ocsp = global.OCSP || {};

  // Deployments may define window.OCSP_RUNTIME_CONFIG before this file loads.
  // The committed defaults intentionally keep the standalone frontend in mock mode.
  const runtime = global.OCSP_RUNTIME_CONFIG || {};
  const requestedSource = runtime.dataSource || "mock";
  const dataSource = ["mock", "api"].includes(requestedSource)
    ? requestedSource
    : "mock";
  const apiBaseUrl = String(runtime.apiBaseUrl || "").replace(/\/+$/, "");

  ocsp.config = Object.freeze({
    dataSource,
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
