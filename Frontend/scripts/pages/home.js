(function initializeOcspHomePage(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const dataService = ocsp.dataService;
  const session = ocsp.sessionService;
  const motion = ocsp.animations;
  const feedback = ocsp.feedback;

  // Navigation feedback is stored before redirects. Consume it on Home too so
  // a successful sign-in never appears later on an unrelated portal page.
  function showPendingFlash() {
    const flash = session && session.consumeFlash ? session.consumeFlash() : null;
    if (!flash || !flash.message || !feedback) return;
    feedback.show(flash.message, { tone: flash.tone || "info" });
  }

  // The shared data service retrieves the signed-in user's unread API records. A count failure never blocks normal home navigation.
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
      if (motion) motion.pulse(badge, count);
    } catch (_error) {
      badge.textContent = "0";
      badge.hidden = true;
      badge.setAttribute("aria-label", "Unread notification count unavailable");
    }
  }

  global.document.addEventListener("DOMContentLoaded", () => {
    showPendingFlash();
    loadUnreadNotificationCount();
  });
})(window);
