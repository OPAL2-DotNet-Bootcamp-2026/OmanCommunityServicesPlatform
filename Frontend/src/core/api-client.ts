/** Shared HTTP transport, authentication headers, and API error handling. */
import type { AppConfig } from "./config";
import { endpoints } from "./api-endpoints";

/** Thrown for any non-2xx response or transport failure. */
export class ApiError extends Error {
  public override readonly name = "ApiError";

  constructor(
    message: string,
    public readonly status: number,
    public readonly details: unknown
  ) {
    super(message);
    // Required when extending a built-in: without it, "err instanceof ApiError"
    // returns false once the class is transpiled down.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

interface RequestOptions {
  method?: string;
  headers?: HeadersInit;
  body?: unknown;
  /** false skips the Authorization header - used by login and register. */
  auth?: boolean;
  /** false suppresses the ocsp:authorization-error event on 401/403. */
  announceAuthorizationError?: boolean;
}

/** Detail carried by the ocsp:authorization-error event. */
export interface AuthorizationErrorDetail {
  status: number;
  path: string;
}

const FALLBACK_BY_STATUS: Record<number, string> = {
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested information could not be found.",
  429: "Too many requests were submitted. Please wait and try again."
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * Pulls a human-readable message out of whatever the API returned. ASP.NET
 * validation problems arrive as { errors: { field: [messages] } }, plain
 * failures as { message } or { Message }, ProblemDetails as { title }.
 */
function normalizeErrorMessage(payload: unknown, fallback: string): string {
  const direct = nonEmptyString(payload);
  if (direct) {
    return direct;
  }

  if (!isRecord(payload)) {
    return fallback;
  }

  const message = nonEmptyString(payload.message) ?? nonEmptyString(payload.Message);
  if (message) {
    return message;
  }

  if (isRecord(payload.errors)) {
    const messages = Object.values(payload.errors)
      .flat()
      .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
    if (messages.length) {
      return messages.join(" ");
    }
  }

  // detail carries the specific reason ("Email is already registered"),
  // title only the generic category ("Registration failed").
  return nonEmptyString(payload.detail) ?? nonEmptyString(payload.title) ?? fallback;
}

/** 204 yields null; a non-JSON body is returned as raw text. */
async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Bodies that must be sent as-is rather than JSON.stringify-ed. */
function isRawRequestBody(body: unknown): body is BodyInit {
  return (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams
  );
}

export class ApiClient {
  public readonly endpoints = endpoints;

  /** Restored by the session service after every page navigation. */
  private accessToken = "";

  constructor(private readonly config: AppConfig) {}

  setAccessToken(token: string): void {
    this.accessToken = typeof token === "string" ? token.trim() : "";
  }

  clearAccessToken(): void {
    this.setAccessToken("");
  }

  private buildApiUrl(path: string): string {
    const candidate = String(path ?? "").trim();
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }
    return `${this.config.apiBaseUrl}/${candidate.replace(/^\/+/, "")}`;
  }

  /** Turns a relative attachment path from the API into an absolute URL. */
  resolveApiAssetUrl(path: string | null | undefined): string {
    const candidate = String(path ?? "").trim();
    if (!candidate || /^(?:https?:)?\/\//i.test(candidate) || !this.config.apiBaseUrl) {
      return candidate;
    }
    try {
      return new URL(candidate, `${this.config.apiBaseUrl}/`).href;
    } catch {
      return "";
    }
  }

  /** The session service listens for this and signs the user out on a 401. */
  private announceAuthFailure(status: number, path: string): void {
    if (status !== 401 && status !== 403) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent<AuthorizationErrorDetail>("ocsp:authorization-error", {
        detail: { status, path }
      })
    );
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!this.config.apiBaseUrl) {
      throw new ApiError(
        "The API address is not configured. Provide apiBaseUrl in OCSP_RUNTIME_CONFIG.",
        0,
        null
      );
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs || 12000
    );

    const headers = new Headers(options.headers ?? {});
    const hasBody = options.body !== undefined;
    const rawBody = hasBody && isRawRequestBody(options.body);

    headers.set("Accept", "application/json");
    if (hasBody && !rawBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (this.accessToken && options.auth !== false) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    const body = rawBody ? (options.body as BodyInit) : JSON.stringify(options.body);

    try {
      const response = await fetch(this.buildApiUrl(path), {
        method: options.method ?? "GET",
        headers,
        body,
        signal: controller.signal
      });
      const payload = await parseResponse(response);

      if (!response.ok) {
        const fallback =
          FALLBACK_BY_STATUS[response.status] ?? `Request failed with status ${response.status}.`;

        if (options.announceAuthorizationError !== false) {
          this.announceAuthFailure(response.status, path);
        }

        throw new ApiError(normalizeErrorMessage(payload, fallback), response.status, {
          payload,
          retryAfter: response.headers.get("Retry-After")
        });
      }

      return payload as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError("The request timed out. Please try again.", 0, null);
      }
      // fetch rejects with TypeError when the connection itself fails - wrong
      // port, API not running, DNS, or a rejected certificate. Naming the
      // address turns an unanswerable message into a checkable one.
      if (error instanceof TypeError) {
        throw new ApiError(
          `The server at ${this.config.apiBaseUrl} could not be reached. Check that the API is running and that the address is right.`,
          0,
          error
        );
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private withMethod<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    return this.request<T>(path, { ...options, method, ...(body === undefined ? {} : { body }) });
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.withMethod<T>("POST", path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.withMethod<T>("PUT", path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.withMethod<T>("PATCH", path, body, options);
  }
}
