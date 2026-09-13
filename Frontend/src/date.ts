/**
 * Parsing for timestamps that come back from the API.
 *
 * SQL Server stores these as UTC, but ASP.NET may serialise them with no zone
 * suffix - "2026-09-13T09:44:00" rather than "...Z". A browser reads a bare
 * timestamp as LOCAL time, so every date in the app was silently shifted by the
 * viewer's offset. In Muscat that is four hours, which is enough to show an
 * issue as reported "tomorrow".
 *
 * Ported from the parseApiDate added to config.js on main. It lives in its own
 * module here rather than hanging off the config object, so callers import it
 * instead of testing whether it happens to exist at runtime.
 */

/** Milliseconds are truncated to three digits; anything longer breaks Date. */
const ISO_DATE_START = /^\d{4}-\d{2}-\d{2}T/;
const OVERLONG_MILLISECONDS = /(\.\d{3})\d+(?=(?:Z|[+-]\d{2}:?\d{2})?$)/i;
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** Always returns a Date; an unparseable value gives an Invalid Date. */
export function parseApiDate(value: string | number | Date | null | undefined): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value === "number") {
    return new Date(value);
  }

  let text = String(value ?? "").trim();
  if (!text) {
    return new Date(Number.NaN);
  }

  if (ISO_DATE_START.test(text)) {
    text = text.replace(OVERLONG_MILLISECONDS, "$1");
    if (!HAS_ZONE.test(text)) {
      text += "Z";
    }
  }

  return new Date(text);
}

/** Milliseconds since the epoch, or 0 when the value cannot be parsed. */
export function apiDateTime(value: string | null | undefined): number {
  const time = parseApiDate(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
