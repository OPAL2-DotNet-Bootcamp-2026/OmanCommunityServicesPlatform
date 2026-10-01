/**
 * Safe string coercion for values not known to be strings. String({}) is
 * "[object Object]", which would happily be stored as a name or searched for;
 * values off API payloads get narrowed instead.
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

/** The form both sides of a search comparison are put into. */
export function normalizedSearch(value: unknown): string {
  return asText(value).trim().toLocaleLowerCase();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
