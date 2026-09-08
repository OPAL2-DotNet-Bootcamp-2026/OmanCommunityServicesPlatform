(function initializeNotificationsPage(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const service = ocsp.dataService;
  const renderers = ocsp.notificationRenderers;
  const shell = ocsp.siteSession;
  const session = ocsp.sessionService;
  const motion = ocsp.animations;
  const feedback = ocsp.feedback;
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
    if (motion) motion.revealStatus(elements.pageStatus);
    if (feedback && ["success", "danger", "warning"].includes(safeTone)) {
      feedback.show(message, { tone: safeTone, announce: false });
    }
  }

  function updateUnreadSummary() {
    const unreadCount = state.notifications.filter((notification) => !notification.isRead).length;
    elements.navCount.textContent = String(unreadCount);
    elements.navCount.hidden = unreadCount === 0;
    elements.navCount.setAttribute(
      "aria-label",
      `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
    );
    if (motion) motion.pulse(elements.navCount, unreadCount);
    if (unreadCount === 0) {
      if (motion) {
        // Retargeting to zero also cancels any count animation that is still running.
        motion.countTo(elements.heroValue, 0, {
          duration: 0,
          format: () => "No unread notifications"
        });
      } else {
        elements.heroValue.textContent = "No unread notifications";
      }
    } else if (motion) {
      motion.countTo(elements.heroValue, unreadCount, {
        format: (value) => `${Math.round(value)} notification${Math.round(value) === 1 ? "" : "s"}`
      });
    } else {
      elements.heroValue.textContent = `${unreadCount} notification${unreadCount === 1 ? "" : "s"}`;
    }
    elements.unreadSummary.textContent = unreadCount === 0
      ? "You have no unread notifications."
      : `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`;
  }

  function renderLoading() {
    elements.footer.hidden = true;
    elements.list.setAttribute("aria-busy", "true");
    if (motion) {
      motion.renderSkeletons(elements.list, {
        count: 3,
        variant: "notification",
        label: "Loading notifications..."
      });
    } else {
      elements.list.innerHTML = `
        <div class="ocsp-card p-4 text-center" role="status">
          <span class="spinner-border text-primary mx-auto mb-3" aria-hidden="true"></span>
          <span class="d-block">Loading notifications...</span>
        </div>`;
    }
  }

  function renderError(error) {
    const message = error.message || "The notifications could not be loaded.";
    elements.footer.hidden = true;
    if (feedback) feedback.error(message, { announce: false });
    elements.list.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <p class="mb-3">${renderers.escapeHtml(message)}</p>
        <button class="ocsp-button ocsp-button--submit" data-action="retry-notifications" type="button">Try again</button>
      </div>`;
  }

  function renderList() {
    elements.list.innerHTML = renderers.renderNotificationList(state.notifications);
    if (motion) {
      const firstRender = elements.list.dataset.ocspMotionRendered !== "true";
      motion.revealList(elements.list, ".notification-card", {
        stagger: firstRender,
        interval: firstRender ? 32 : 0,
        duration: firstRender ? 220 : 160,
        distance: firstRender ? 10 : 5
      });
      elements.list.dataset.ocspMotionRendered = "true";
    }
    elements.list.setAttribute("aria-busy", "false");
    elements.footer.hidden = state.notifications.length === 0;
    updateUnreadSummary();
  }

  async function loadNotifications() {
    const flash = session && session.consumeFlash ? session.consumeFlash() : null;
    setPageStatus("", "info");
    if (flash && flash.message) setPageStatus(flash.message, flash.tone);
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
      if (targetHref) global.location.assign(targetHref);
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
      if (!targetHref && feedback) {
        feedback.success("Notification marked as read.");
      }
    } catch (error) {
      if ([401, 403].includes(Number(error && error.status))) {
        setPageStatus(error.message || "Your session could not be verified.", "danger");
        return;
      }
      if (!targetHref) {
        setPageStatus(error.message || "The notification could not be marked as read.", "danger");
      }
    } finally {
      trigger.removeAttribute("aria-busy");
      state.pendingNotificationIds.delete(notificationId);
    }

    // Opening the related issue must not depend on a non-auth read-status write.
    if (targetHref) global.location.assign(targetHref);
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
      event.preventDefault();
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
