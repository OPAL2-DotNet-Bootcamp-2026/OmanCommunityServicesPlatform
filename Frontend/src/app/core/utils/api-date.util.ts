/**
 * Parsing for timestamps from the API. SQL Server stores UTC, but ASP.NET may
 * send no zone suffix ("2026-09-13T09:44:00"), which a browser reads as LOCAL
 * time - four hours off in Muscat. A bare timestamp is treated as UTC here.
 */

const ISO_DATE_START = /^\d{4}-\d{2}-\d{2}T/;
/** Milliseconds are cut to three digits; anything longer breaks Date. */
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
