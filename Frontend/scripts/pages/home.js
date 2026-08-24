(function initializeOcspHomePage(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const dataService = ocsp.dataService;
  const session = ocsp.sessionService;

  // The badge uses the shared data service, so mock and API modes follow the
  // same rendering path. A count failure never blocks normal home navigation.
  async function loadUnreadNotificationCount() {
    const badge = global.document.getElementById("homeNotificationCount");
    const user = session && session.getUser();
    if (!badge || !user || !dataService) {
      return;
    }

    try {
      const notifications = await dataService.getUnreadNotifications();
      const count = Array.isArray(notifications) ? notifications.length : 0;
      badge.textContent = String(count);
      badge.hidden = count === 0;
      badge.setAttribute(
        "aria-label",
        `${count} unread notification${count === 1 ? "" : "s"}`
      );
    } catch (_error) {
      badge.textContent = "0";
      badge.hidden = true;
      badge.setAttribute("aria-label", "Unread notification count unavailable");
    }
  }

  global.document.addEventListener("DOMContentLoaded", loadUnreadNotificationCount);
})(window);
