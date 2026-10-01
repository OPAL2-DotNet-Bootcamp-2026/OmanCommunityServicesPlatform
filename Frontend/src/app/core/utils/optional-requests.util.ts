/**
 * Pages load one essential request plus several optional ones (lookups,
 * notifications). An optional request that fails must not break the page: it
 * falls back to a default and its section name is reported as a warning.
 */
import { type Observable, catchError, map, of } from "rxjs";

export interface OptionalResult<T> {
  value: T;
  failed: boolean;
}

/** Never errors: a failure becomes { value: fallback, failed: true }. */
export function optionalRequest<T>(source: Observable<T>, fallback: T): Observable<OptionalResult<T>> {
  return source.pipe(
    map((value) => ({ value, failed: false })),
    catchError(() => of({ value: fallback, failed: true }))
  );
}

/** The labels of the sections that failed, in the order given. */
export function failedSections(sections: Record<string, OptionalResult<unknown>>): string[] {
  return Object.entries(sections).flatMap(([label, result]) => (result.failed ? [label] : []));
}

/** Defensive array coercion for payloads the API might return as null. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
