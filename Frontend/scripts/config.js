(function initializeOcspConfig(global) {
  "use strict";

  const ocsp = global.OCSP || {};

  // Deployments may define window.OCSP_RUNTIME_CONFIG before this file loads.
  // Local development uses the backend HTTP profile configured in launchSettings.json.
  const runtime = global.OCSP_RUNTIME_CONFIG || {};

  // Resolve page routes from config.js so they work from both the root and /pages.
  const configScript = global.document.currentScript
    || global.document.querySelector('script[src$="scripts/config.js"]');
  const frontendBaseUrl = new URL(
    "../",
    configScript ? configScript.src : `${global.location.origin}/scripts/config.js`
  );
  const frontendPageUrl = (path) => new URL(path, frontendBaseUrl).href;
  const apiBaseUrl = String(runtime.apiBaseUrl || "http://localhost:7130") // port: 7130 for https
    .replace(/\/+$/, "");

  // SQL Server DateTime values are UTC, but ASP.NET may serialize them without
  // a zone suffix. Normalize those API timestamps before browser date parsing.
  function parseApiDate(value) {
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value === "number") return new Date(value);

    let text = String(value || "").trim();
    if (!text) return new Date(Number.NaN);
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      text = text.replace(/(\.\d{3})\d+(?=(?:Z|[+-]\d{2}:?\d{2})?$)/i, "$1");
      if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) text += "Z";
    }
    return new Date(text);
  }

  ocsp.config = Object.freeze({
    apiBaseUrl,
    parseApiDate,
    requestTimeoutMs: Number(runtime.requestTimeoutMs) || 12000,
    locale: "en-OM",
    timeZone: "Asia/Muscat",
    sessionStorageKey: "ocsp.session",
    routes: Object.freeze({
      anonymousHome: frontendPageUrl("index.html"),
      login: frontendPageUrl("pages/login.html"),
      citizenHome: frontendPageUrl("pages/my-issues.html"),
      staffHome: frontendPageUrl("pages/dashboard.html"),
      adminHome: frontendPageUrl("pages/dashboard.html")
    })
  });

  global.OCSP = ocsp;
})(window);
