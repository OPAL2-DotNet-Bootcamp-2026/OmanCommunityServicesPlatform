/**
 * Notification list: grouped by day, marked read in place.
 *
 * Marking read updates local state and re-renders rather than refetching, which
 * is what makes the page feel instant.
 */
import { ApiError } from "../core/api-client";
import { announceStatus, byId, errorMessage, setAlert } from "../dom";
import * as feedback from "../components/feedback";
import { countTo, pulse, renderSkeletons, revealList } from "../components/motion";
import {
  escapeHtml,
  renderNotificationList
} from "../components/notification-renderers";
import type { Notification } from "../models";
import type { DataService } from "../services/data.service";
import type { SessionService } from "../services/session.service";

interface NotificationElements {
  list: HTMLElement;
  navCount: HTMLElement;
  heroValue: HTMLElement;
  unreadSummary: HTMLElement;
  pageStatus: HTMLElement;
  footer: HTMLElement;
}

export class NotificationsPage {
  private elements!: NotificationElements;
  private notifications: Notification[] = [];
  private readonly pendingNotificationIds = new Set<number>();

  constructor(
    private readonly data: DataService,
    private readonly session: SessionService
  ) {}

  private cacheElements(): NotificationElements {
    return {
      list: byId<HTMLElement>("notificationList"),
      navCount: byId<HTMLElement>("notificationNavCount"),
      heroValue: byId<HTMLElement>("notificationHeroValue"),
      unreadSummary: byId<HTMLElement>("notificationUnreadSummary"),
      pageStatus: byId<HTMLElement>("notificationPageStatus"),
      footer: byId<HTMLElement>("notificationListFooter")
    };
  }

  private setPageStatus(message: string, tone?: string): void {
    announceStatus(this.elements.pageStatus, message, tone, "mb-4");
    if (!message) {
      this.elements.pageStatus.className = "d-none";
    }
  }

  private updateUnreadSummary(): void {
    const unreadCount = this.notifications.filter((notification) => !notification.isRead).length;
    const plural = unreadCount === 1 ? "" : "s";

    this.elements.navCount.textContent = String(unreadCount);
    this.elements.navCount.hidden = unreadCount === 0;
    this.elements.navCount.setAttribute(
      "aria-label",
      `${unreadCount} unread notification${plural}`
    );
    pulse(this.elements.navCount, unreadCount);

    if (unreadCount === 0) {
      // Retargeting to zero also cancels a count that is still animating.
      countTo(this.elements.heroValue, 0, {
        duration: 0,
        format: () => "No unread notifications"
      });
    } else {
      countTo(this.elements.heroValue, unreadCount, {
        format: (value) =>
          `${Math.round(value)} notification${Math.round(value) === 1 ? "" : "s"}`
      });
    }
    this.elements.unreadSummary.textContent =
      unreadCount === 0
        ? "You have no unread notifications."
        : `You have ${unreadCount} unread notification${plural}.`;
  }

  private renderLoading(): void {
    this.elements.footer.hidden = true;
    // Skeletons hold the final layout so the page does not collapse and jump.
    renderSkeletons(this.elements.list, {
      count: 3,
      variant: "notification",
      label: "Loading notifications..."
    });
  }

  private renderError(error: unknown): void {
    this.elements.footer.hidden = true;
    const message = errorMessage(error, "The notifications could not be loaded.");
    feedback.error(message, { announce: false });
    this.elements.list.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <p class="mb-3">${escapeHtml(message)}</p>
        <button class="ocsp-button ocsp-button--submit" data-action="retry-notifications" type="button">Try again</button>
      </div>`;
  }

  private renderList(): void {
    const role = this.session.getUser()?.role ?? "";
    this.elements.list.innerHTML = renderNotificationList(this.notifications, role);
    this.elements.list.setAttribute("aria-busy", "false");
    this.elements.footer.hidden = this.notifications.length === 0;

    // Stagger only the first paint; later re-renders are a filter, not an entry.
    const firstRender = this.elements.list.dataset.ocspMotionRendered !== "true";
    revealList(this.elements.list, ".notification-card", {
      stagger: firstRender,
      interval: firstRender ? 32 : 0,
      duration: firstRender ? 220 : 160,
      distance: firstRender ? 10 : 5
    });
    this.elements.list.dataset.ocspMotionRendered = "true";

    this.updateUnreadSummary();
  }

  private loadNotifications = async (): Promise<void> => {
    this.setPageStatus("");
    this.renderLoading();
    try {
      this.notifications = await this.data.getNotifications();
      this.renderList();
    } catch (error) {
      this.elements.list.setAttribute("aria-busy", "false");
      this.renderError(error);
    }
  };

  private async markRead(trigger: HTMLElement): Promise<void> {
    const notificationId = Number(trigger.dataset.notificationId);
    const targetHref = trigger.getAttribute("href") ?? "";

    const followLink = (): void => {
      if (targetHref) {
        window.location.assign(targetHref);
      }
    };

    if (!Number.isInteger(notificationId) || notificationId < 1) {
      followLink();
      return;
    }
    if (trigger.dataset.read === "true") {
      followLink();
      return;
    }
    if (this.pendingNotificationIds.has(notificationId)) {
      return;
    }

    this.pendingNotificationIds.add(notificationId);
    trigger.setAttribute("aria-busy", "true");

    try {
      await this.data.markNotificationAsRead(notificationId);
      const notification = this.notifications.find(
        (item) => Number(item.notificationId) === notificationId
      );
      if (notification) {
        notification.isRead = true;
      }
      trigger.dataset.read = "true";
      trigger.classList.remove("is-unread");
      trigger.querySelector(".unread-dot")?.remove();
      this.updateUnreadSummary();
      // Following a link navigates away, so a toast there would never be seen.
      if (!targetHref) {
        feedback.success("Notification marked as read.");
      }
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        this.setPageStatus(
          errorMessage(error, "Your session could not be verified."),
          "danger"
        );
        return;
      }
      if (!targetHref) {
        this.setPageStatus(
          errorMessage(error, "The notification could not be marked as read."),
          "danger"
        );
      }
    } finally {
      trigger.removeAttribute("aria-busy");
      this.pendingNotificationIds.delete(notificationId);
    }

    // Opening the related issue must not depend on the read-status write.
    followLink();
  }

  private bindEvents(): void {
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest('[data-action="retry-notifications"]')) {
        void this.loadNotifications();
        return;
      }

      const trigger = event.target.closest<HTMLElement>(
        '[data-action="open-notification"], [data-action="mark-notification-read"]'
      );
      if (!trigger) {
        return;
      }
      event.preventDefault();
      void this.markRead(trigger);
    });
  }

  start(): void {
    try {
      this.elements = this.cacheElements();
    } catch (error) {
      const status = document.getElementById("notificationPageStatus");
      if (!status) {
        throw error;
      }
      setAlert(status, errorMessage(error, "The notifications page failed to start."), "danger", "mb-4");
      return;
    }

    const flash = this.session.consumeFlash();
    this.bindEvents();
    void this.loadNotifications();
    if (flash) {
      this.setPageStatus(flash.message, flash.tone);
    }
  }
}
