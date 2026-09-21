/** Results shared by pages with one required request and optional sections. */
export function requiredValue<T>(result: PromiseSettledResult<T>): T {
  if (result.status === "rejected") throw result.reason;
  return result.value;
}

/** Optional arrays fall back to empty for rejected or malformed responses. */
export function settledArray<T>(result: PromiseSettledResult<T[]>): T[] {
  return asArray<T>(result.status === "fulfilled" ? result.value : []);
}

/** Names of rejected sections, in request order. */
export function rejectedSections(
  results: PromiseSettledResult<unknown>[],
  labels: string[]
): string[] {
  return results.flatMap((result, index) =>
    result.status === "rejected" && labels[index] ? [labels[index]] : []
  );
}

/** Defensive array coercion for payloads the API might return as null. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
