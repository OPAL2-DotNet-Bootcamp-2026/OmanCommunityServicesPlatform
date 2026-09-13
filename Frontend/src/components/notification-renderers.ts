/**
 * Member 1 - convert from scripts/components/notification-renderers.js (181
 * lines). This is your PR B, after models and core have landed.
 *
 * Four exported functions; the other six in the JavaScript are private helpers
 * and should stay module-private.
 *
 * Note escapeHtml is duplicated here and in issue-renderers.js. Leave the
 * duplication alone for now - deleting it would put your PR and Member 3's PR
 * in the same file, which is the one thing the split is designed to prevent.
 * Deduplicate it in a follow-up once both have merged.
 *
 * groupNotifications (:132) buckets by day into Today / Yesterday / a date.
 * A Record<string, Notification[]> is the honest type for that accumulator.
 */
import type { Notification } from "../models";

export function escapeHtml(_value: unknown): string {
  throw new Error("escapeHtml - Member 1, from notification-renderers.js:8");
}

export function formatRelativeTime(_value: string): string {
  throw new Error("formatRelativeTime - Member 1, from notification-renderers.js:38");
}

export function getNotificationHref(_notification: Notification): string {
  throw new Error("getNotificationHref - Member 1, from notification-renderers.js:93");
}

export function renderNotificationList(_notifications: Notification[]): string {
  throw new Error("renderNotificationList - Member 1, from notification-renderers.js:153");
}
