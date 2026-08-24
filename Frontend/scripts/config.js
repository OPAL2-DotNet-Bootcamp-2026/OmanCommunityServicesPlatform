(function initializeOcspConfig(global) {
  "use strict";

  const ocsp = global.OCSP || {};

  ocsp.config = Object.freeze({
    // Keep this set to "mock" until backend integration is intentionally enabled.
    dataSource: "mock",
    apiBaseUrl: "",
    requestTimeoutMs: 12000,
    locale: "en-OM",
    timeZone: "Asia/Muscat"
  });

  global.OCSP = ocsp;
})(window);
