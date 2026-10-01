/**
 * The one error type every failed API call surfaces as, with a message a
 * citizen can read. Pages show error.message as-is.
 */
import { isRecord } from "../utils/text-coercion.util";

export class ApiError extends Error {
  public override readonly name = "ApiError";

  constructor(
    message: string,
    /** HTTP status, or 0 when the server could not be reached or timed out. */
    public readonly status: number,
    public readonly details: unknown = null
  ) {
    super(message);
    // Without this, "error instanceof ApiError" is false once transpiled.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

const FALLBACK_BY_STATUS: Record<number, string> = {
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested information could not be found.",
  429: "Too many requests were submitted. Please wait and try again."
};

export function fallbackMessageFor(status: number): string {
  return FALLBACK_BY_STATUS[status] ?? `Request failed with status ${status}.`;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * The readable message inside whatever the API returned: ASP.NET validation
 * ({ errors: { field: [..] } }), plain ({ message }), or ProblemDetails, where
 * detail is the specific reason and title only the generic category.
 */
export function apiErrorMessage(payload: unknown, fallback: string): string {
  const direct = nonEmptyString(payload);
  if (direct) {
    return direct;
  }
  if (!isRecord(payload)) {
    return fallback;
  }

  const message = nonEmptyString(payload["message"]) ?? nonEmptyString(payload["Message"]);
  if (message) {
    return message;
  }

  const errors = payload["errors"];
  if (isRecord(errors)) {
    const messages = Object.values(errors)
      .flat()
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
    if (messages.length) {
      return messages.join(" ");
    }
  }

  return nonEmptyString(payload["detail"]) ?? nonEmptyString(payload["title"]) ?? fallback;
}

/** error.message for an Error, otherwise the fallback. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
