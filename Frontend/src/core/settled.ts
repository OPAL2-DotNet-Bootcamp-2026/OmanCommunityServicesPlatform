/**
 * Helpers for the "one essential request, several optional ones" pattern that
 * both the citizen and staff dashboards use.
 *
 * The optional sections are fetched with Promise.allSettled so a comments or
 * lookup outage degrades one part of the page instead of replacing a perfectly
 * good issue list with an error. The names of the failed sections come back and
 * the page shows them as warnings.
 */

/** The value of a fulfilled result, or the fallback if it rejected. */
export function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

/** Names of the sections whose requests rejected, in the order given. */
export function rejectedSections(
  results: PromiseSettledResult<unknown>[],
  labels: string[]
): string[] {
  return results
    .map((result, index) => (result.status === "rejected" ? (labels[index] ?? "") : ""))
    .filter((label) => label.length > 0);
}

/** Defensive array coercion for payloads the API might return as null. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
