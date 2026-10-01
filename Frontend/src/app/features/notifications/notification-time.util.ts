/** Times on notifications: "Just now", "5 minutes ago", "Yesterday, 4:10 PM", or a full date. */
import { parseApiDate } from "../../core/utils/api-date.util";

export interface ZoneSettings {
  locale: string;
  timeZone: string;
}

/** The calendar day in the given time zone ("2026-09-30"), used to group Today / Earlier. */
export function calendarDay(date: Date, zone: ZoneSettings): string {
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return "";
  }
}

export function formatRelativeTime(value: string, zone: ZoneSettings, now = new Date()): string {
  const date = parseApiDate(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  const differenceMs = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(differenceMs / 60000);
  const hours = Math.floor(differenceMs / 3600000);
  const day = calendarDay(date, zone);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (day === calendarDay(now, zone)) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const time = new Intl.DateTimeFormat(zone.locale, { timeZone: zone.timeZone, hour: "numeric", minute: "2-digit" }).format(date);
  if (day === calendarDay(new Date(now.getTime() - 86400000), zone)) {
    return `Yesterday, ${time}`;
  }
  return new Intl.DateTimeFormat(zone.locale, {
    timeZone: zone.timeZone, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"
  }).format(date);
}
