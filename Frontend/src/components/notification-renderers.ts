/**
 * Pure presentation for the notifications page.
 *
 * The JavaScript version read the signed-in role off the session global to
 * decide where a notification links to. That is now a parameter, which keeps
 * these functions pure and makes the role a plain @Input() under Angular.
 */
import { config } from "../core/config";
import { parseApiDate } from "../date";
import type { Notification, SessionRole } from "../models";
import { escapeHtml } from "./issue-renderers";

export { escapeHtml };

interface IconMeta {
  icon: string;
  tone: string;
}

function positiveInteger(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

/** Calendar day in the configured time zone, used to bucket by Today/Earlier. */
function dateKey(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: config.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  } catch {
    return "";
  }
}

export function formatRelativeTime(value: string): string {
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  const now = new Date();
  const differenceMs = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(differenceMs / 60000);
  const hours = Math.floor(differenceMs / 3600000);
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getTime() - 86400000));
  const notificationDay = dateKey(date);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (notificationDay === today) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const time = new Intl.DateTimeFormat(config.locale, {
    timeZone: config.timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(date);

  if (notificationDay === yesterday) {
    return `Yesterday, ${time}`;
  }

  return new Intl.DateTimeFormat(config.locale, {
    timeZone: config.timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function iconMeta(notification: Notification): IconMeta {
  const type = String(notification.type ?? "");
  const message = String(notification.message ?? "").toLowerCase();

  if (type === "Assignment") {
    return { icon: "bi-plus-circle-fill", tone: "" };
  }
  if (type === "Comment") {
    return { icon: "bi-chat-left-text-fill", tone: "" };
  }
  if (message.includes("resolved")) {
    return { icon: "bi-check-circle-fill", tone: " is-success" };
  }
  if (message.includes("in progress")) {
    return { icon: "bi-arrow-repeat", tone: " is-warning" };
  }
  return { icon: "bi-arrow-repeat", tone: " is-neutral" };
}

/** Staff and Admin land on the dashboard; everyone else on their own issues. */
export function getNotificationHref(notification: Notification, role: SessionRole): string {
  const issueId = positiveInteger(notification?.issueId);
  if (!issueId) {
    return "";
  }

  const page = role === "Staff" || role === "Admin" ? "dashboard.html" : "my-issues.html";
  const anchor = page === "dashboard.html" ? "issuesAccordion" : "citizenIssuesGallery";
  return `${page}?issueId=${issueId}#${anchor}`;
}

function renderNotificationCard(notification: Notification, role: SessionRole): string {
  const notificationId = positiveInteger(notification.notificationId);
  if (!notificationId) {
    return "";
  }

  const href = getNotificationHref(notification, role);
  const icon = iconMeta(notification);
  const unreadClass = notification.isRead ? "" : " is-unread";
  const action = href ? "open-notification" : "mark-notification-read";
  const commonAttributes = `data-action="${action}" data-notification-id="${notificationId}" data-read="${notification.isRead ? "true" : "false"}"`;
  const content = `
      <span class="notification-icon${icon.tone}" aria-hidden="true"><i class="bi ${icon.icon}"></i></span>
      <span class="flex-grow-1">
        <span class="notification-card__title">${escapeHtml(notification.message || "Notification update")}</span>
        <span class="notification-card__time">${escapeHtml(formatRelativeTime(notification.createdAt))}</span>
      </span>
      ${notification.isRead ? "" : '<span class="unread-dot" aria-label="Unread"></span>'}`;

  if (href) {
    return `<a class="notification-card${unreadClass}" ${commonAttributes} href="${escapeHtml(href)}">${content}</a>`;
  }

  return `<button class="notification-card${unreadClass} w-100 text-start" ${commonAttributes} type="button">${content}</button>`;
}

function groupNotifications(notifications: Notification[]): Record<string, Notification[]> {
  const nowKey = dateKey(new Date());
  const groups: Record<string, Notification[]> = { Today: [], Earlier: [] };

  [...notifications]
    .sort(
      (left, right) =>
        parseApiDate(right.createdAt).getTime() - parseApiDate(left.createdAt).getTime()
    )
    .forEach((notification) => {
      const key = dateKey(parseApiDate(notification.createdAt)) === nowKey ? "Today" : "Earlier";
      groups[key]?.push(notification);
    });

  return groups;
}

function renderEmptyState(): string {
  return `
      <div class="ocsp-card p-4 text-center" role="status">
        <i class="bi bi-bell-slash fs-3 text-secondary" aria-hidden="true"></i>
        <h3 class="h5 mt-3">No notifications yet</h3>
        <p class="text-secondary mb-0">Updates connected to your reports will appear here.</p>
      </div>`;
}

export function renderNotificationList(
  notifications: Notification[],
  role: SessionRole = ""
): string {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return renderEmptyState();
  }

  const groups = groupNotifications(notifications);
  return Object.entries(groups)
    .filter(([, values]) => values.length > 0)
    .map(([label, values]) => {
      const labelId = `${label.toLowerCase()}Notifications`;
      const cards = values.map((item) => renderNotificationCard(item, role)).join("");
      return `
          <section class="notification-group" aria-labelledby="${labelId}">
            <h3 class="group-label" id="${labelId}">${label}</h3>
            <div class="notification-list">
              ${cards}
            </div>
          </section>`;
    })
    .join("");
}
