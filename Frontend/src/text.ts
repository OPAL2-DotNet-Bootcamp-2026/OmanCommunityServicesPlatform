/**
 * Safe string coercion for values that are not known to be strings.
 *
 * The JavaScript used String(value) everywhere. That is fine for a string or a
 * number and quietly wrong for anything else: String({}) is "[object Object]",
 * which would happily be stored as somebody's name or sent as a search term.
 * Since these values come off API payloads and form data, they get narrowed.
 */

/** A string, a stringified number or boolean, otherwise the fallback. */
export function asText(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

/**
 * FormData.get returns string | File | null. Every field the forms read is a
 * text input, so a File means the markup and the code disagree - treat it as
 * absent rather than stringifying it.
 */
export function formString(data: FormData, key: string, fallback = ""): string {
  const value = data.get(key);
  return typeof value === "string" ? value : fallback;
}
