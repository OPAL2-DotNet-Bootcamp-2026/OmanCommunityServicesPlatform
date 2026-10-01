import { NgTemplateOutlet } from "@angular/common";
import { Component, computed, inject, input, output } from "@angular/core";
import { APP_CONFIG } from "../../../core/config/app-config.token";
import { type SessionRole } from "../../../core/models/enums";
import { type Notification } from "../../../core/models/notification.model";
import { AppPaths } from "../../../core/routing/app-paths";
import { parseApiDate } from "../../../core/utils/api-date.util";
import { RevealOnEnterDirective } from "../../../shared/directives/reveal-on-enter.directive";
import { calendarDay, formatRelativeTime } from "../notification-time.util";

/** A notification ready to draw. */
interface NotificationRow {
  notification: Notification;
  /** Where clicking it goes: the related issue, or "" when it has none. */
  href: string;
  icon: string;
  /** "", " is-success", " is-warning" or " is-neutral". */
  tone: string;
  time: string;
}

interface NotificationGroup {
  label: "Today" | "Earlier";
  rows: NotificationRow[];
}

/** The notifications, newest first, grouped into Today and Earlier. Clicking one emits `open`. */
@Component({
  selector: "ocsp-notification-list",
  imports: [NgTemplateOutlet, RevealOnEnterDirective],
  templateUrl: "./notification-list.component.html",
  styleUrl: "./notification-list.component.css"
})
export class NotificationListComponent {
  readonly notifications = input.required<Notification[]>();
  /** Staff and Admin open issues on the dashboard; citizens on My Issues. */
  readonly role = input<SessionRole>("");
  readonly open = output<{ notification: Notification; href: string }>();

  private readonly zone = inject(APP_CONFIG);

  protected readonly groups = computed<NotificationGroup[]>(() => {
    const today = calendarDay(new Date(), this.zone);
    const rows = [...this.notifications()]
      .filter((notification) => Number(notification.notificationId) > 0)
      .sort((left, right) => parseApiDate(right.createdAt).getTime() - parseApiDate(left.createdAt).getTime())
      .map((notification) => this.toRow(notification));
    const isToday = (row: NotificationRow): boolean =>
      calendarDay(parseApiDate(row.notification.createdAt), this.zone) === today;
    return ([
      { label: "Today", rows: rows.filter(isToday) },
      { label: "Earlier", rows: rows.filter((row) => !isToday(row)) }
    ] satisfies NotificationGroup[]).filter((group) => group.rows.length);
  });

  protected select(event: Event, row: NotificationRow): void {
    event.preventDefault();
    this.open.emit({ notification: row.notification, href: row.href });
  }

  private toRow(notification: Notification): NotificationRow {
    const type = String(notification.type ?? "");
    const message = String(notification.message ?? "").toLowerCase();
    const [icon, tone] =
      type === "Assignment" ? ["bi-plus-circle-fill", ""]
      : type === "Comment" ? ["bi-chat-left-text-fill", ""]
      : message.includes("resolved") ? ["bi-check-circle-fill", " is-success"]
      : message.includes("in progress") ? ["bi-arrow-repeat", " is-warning"]
      : ["bi-arrow-repeat", " is-neutral"];

    const issueId = Number(notification.issueId);
    const staff = this.role() === "Staff" || this.role() === "Admin";
    const href = Number.isInteger(issueId) && issueId > 0
      ? `${staff ? AppPaths.dashboard : AppPaths.myIssues}?issueId=${issueId}#${staff ? "issuesAccordion" : "citizenIssuesGallery"}`
      : "";

    return { notification, href, icon, tone, time: formatRelativeTime(notification.createdAt, this.zone) };
  }
}
