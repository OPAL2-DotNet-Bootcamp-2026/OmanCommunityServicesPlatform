import { Pipe, type PipeTransform, inject } from "@angular/core";
import { APP_CONFIG } from "../../core/config/app-config.token";
import { parseApiDate } from "../../core/utils/api-date.util";

const FORMATS: Record<"date" | "dateTime", Intl.DateTimeFormatOptions> = {
  date: { day: "numeric", month: "short", year: "numeric" },
  dateTime: { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }
};

/**
 * An API timestamp in Muscat time: {{ issue.reportedDate | apiDate }} -> "13 Sept 2026",
 * {{ comment.commentDate | apiDate: 'dateTime' }} adds the time.
 * Uses parseApiDate, so a zone-less UTC timestamp is not read as local time.
 */
@Pipe({ name: "apiDate" })
export class ApiDatePipe implements PipeTransform {
  private readonly config = inject(APP_CONFIG);

  transform(value: string | null | undefined, format: "date" | "dateTime" = "date"): string {
    if (!value) {
      return "Latest status";
    }
    const date = parseApiDate(value);
    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }
    try {
      return new Intl.DateTimeFormat(this.config.locale, { ...FORMATS[format], timeZone: this.config.timeZone }).format(date);
    } catch {
      return date.toLocaleDateString();
    }
  }
}
