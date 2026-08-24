(function initializeNotificationsPage(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const service = ocsp.dataService;
  const renderers = ocsp.notificationRenderers;
  const shell = ocsp.siteSession;
  const session = ocsp.sessionService;
  const state = {
    notifications: [],
    pendingNotificationIds: new Set()
  };
  let elements = {};

  function cacheElements() {
    elements = {
      list: global.document.getElementById("notificationList"),
      navCount: global.document.getElementById("notificationNavCount"),
      heroValue: global.document.getElementById("notificationHeroValue"),
      unreadSummary: global.document.getElementById("notificationUnreadSummary"),
      pageStatus: global.document.getElementById("notificationPageStatus"),
      footer: global.document.getElementById("notificationListFooter")
    };
  }

  function setPageStatus(message, tone) {
    if (!message) {
      elements.pageStatus.className = "d-none";
      elements.pageStatus.textContent = "";
      return;
    }

    const safeTone = ["success", "danger", "warning", "info"].includes(tone)
      ? tone
      : "info";
    elements.pageStatus.className = `alert alert-${safeTone} mb-4`;
    elements.pageStatus.textContent = message;
  }

  function updateUnreadSummary() {
    const unreadCount = state.notifications.filter((notification) => !notification.isRead).length;
    elements.navCount.textContent = String(unreadCount);
    elements.navCount.hidden = unreadCount === 0;
    elements.navCount.setAttribute(
      "aria-label",
      `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
    );
    elements.heroValue.textContent = unreadCount === 0
      ? "No unread notifications"
      : `${unreadCount} notification${unreadCount === 1 ? "" : "s"}`;
    elements.unreadSummary.textContent = unreadCount === 0
      ? "You have no unread notifications."
      : `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`;
  }

  function renderLoading() {
    elements.footer.hidden = true;
    elements.list.setAttribute("aria-busy", "true");
    elements.list.innerHTML = `
      <div class="ocsp-card p-4 text-center" role="status">
        <span class="spinner-border text-primary mx-auto mb-3" aria-hidden="true"></span>
        <span class="d-block">Loading notifications...</span>
      </div>`;
  }

  function renderError(error) {
    elements.footer.hidden = true;
    elements.list.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <p class="mb-3">${renderers.escapeHtml(error.message || "The notifications could not be loaded.")}</p>
        <button class="ocsp-button ocsp-button--submit" data-action="retry-notifications" type="button">Try again</button>
      </div>`;
  }

  function renderList() {
    elements.list.innerHTML = renderers.renderNotificationList(state.notifications);
    elements.list.setAttribute("aria-busy", "false");
    elements.footer.hidden = state.notifications.length === 0;
    updateUnreadSummary();
  }

  async function loadNotifications() {
    setPageStatus("", "info");
    renderLoading();
    try {
      state.notifications = await service.getNotifications();
      renderList();
    } catch (error) {
      elements.list.setAttribute("aria-busy", "false");
      renderError(error);
    }
  }

  async function markRead(trigger) {
    const notificationId = Number(trigger.dataset.notificationId);
    const targetHref = trigger.getAttribute("href") || "";
    if (!Number.isInteger(notificationId) || notificationId < 1) {
      return;
    }

    if (trigger.dataset.read === "true") {
      if (targetHref) global.location.assign(targetHref);
      return;
    }
    if (state.pendingNotificationIds.has(notificationId)) {
      return;
    }

    state.pendingNotificationIds.add(notificationId);
    trigger.setAttribute("aria-busy", "true");
    try {
      await service.markNotificationAsRead(notificationId);
      const notification = state.notifications.find(
        (item) => Number(item.notificationId) === notificationId
      );
      if (notification) notification.isRead = true;
      trigger.dataset.read = "true";
      trigger.classList.remove("is-unread");
      trigger.querySelector(".unread-dot")?.remove();
      updateUnreadSummary();
      if (targetHref) global.location.assign(targetHref);
    } catch (error) {
      setPageStatus(error.message || "The notification could not be marked as read.", "danger");
    } finally {
      trigger.removeAttribute("aria-busy");
      state.pendingNotificationIds.delete(notificationId);
    }
  }

  function bindEvents() {
    global.document.addEventListener("click", (event) => {
      const retry = event.target.closest('[data-action="retry-notifications"]');
      if (retry) {
        loadNotifications();
        return;
      }

      const trigger = event.target.closest(
        '[data-action="open-notification"], [data-action="mark-notification-read"]'
      );
      if (!trigger) {
        return;
      }
      if (trigger.dataset.read !== "true") {
        event.preventDefault();
      }
      markRead(trigger);
    });
  }

  function start() {
    if (shell && !shell.isPageAllowed()) {
      return;
    }

    cacheElements();
    if (!service || !renderers || Object.values(elements).some((element) => !element)) {
      throw new Error("The notification page modules were not loaded in the expected order.");
    }

    const flash = session && session.consumeFlash();
    bindEvents();
    loadNotifications();
    if (flash) setPageStatus(flash.message, flash.tone);
  }

  global.document.addEventListener("DOMContentLoaded", () => {
    try {
      start();
    } catch (error) {
      cacheElements();
      if (elements.pageStatus) {
        elements.pageStatus.className = "alert alert-danger mb-4";
        elements.pageStatus.textContent = error.message;
      }
    }
  });
})(window);
