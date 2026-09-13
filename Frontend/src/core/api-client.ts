/**
 * Member 1 - convert from scripts/services/api-client.js (288 lines), minus
 * the ApiError class and the endpoints map, which now live next door.
 *
 * This is the most important file in the migration: every other member's
 * typing flows out of the generics you put on these methods. Get get<T> right
 * and the rest of the codebase types itself.
 *
 * What the JavaScript already does, all of which must survive:
 *   - AbortController timeout from config.requestTimeoutMs (api-client.js:181)
 *   - JSON body unless it is FormData, Blob, URLSearchParams or a string
 *   - Bearer header from the in-memory token, skipped when auth is false
 *   - friendly fallback messages per status (401/403/404/429)
 *   - an ocsp:authorization-error CustomEvent on 401/403, which the session
 *     service listens for
 *   - AbortError and TypeError both mapped to ApiError with status 0
 *
 * Typing notes:
 *   - Make the methods generic, not "returns unknown". The caller says what it
 *     expects: api.get<Issue[]>(...). Note this is an assertion, not a
 *     validation - you are trusting the backend. That is the normal trade, but
 *     know you are making it.
 *   - parseResponse can return a parsed object, a raw string, or null for 204.
 *     unknown is the honest type for it internally.
 *   - RequestOptions needs method, headers, body, auth and
 *     announceAuthorizationError. body is BodyInit | unknown - raw types pass
 *     through, everything else gets JSON.stringify.
 *
 * Change protected back to private once you actually use these in method
 * bodies; protected is only here so the stub compiles under noUnusedLocals.
 */
import type { AppConfig } from "./config";
import { endpoints, type ApiEndpoints } from "./api-endpoints";

/**
 * Thrown by every ApiClient method. Member 1 converts it from the ApiError
 * class at scripts/services/api-client.js:72.
 *
 * Watch out: extending Error in TypeScript needs
 *   Object.setPrototypeOf(this, ApiError.prototype)
 * in the constructor, or "err instanceof ApiError" silently returns false.
 * Every page branches on that check, so this one matters.
 *
 * details carries the parsed payload and the Retry-After header. It is
 * genuinely unknown at the type level - narrow at the call site, do not
 * reach for any.
 */
export class ApiError extends Error {
  public override readonly name = "ApiError";

  constructor(
    message: string,
    public readonly status: number,
    public readonly details: unknown
  ) {
    super(message);
    throw new Error("api-error.ts - Member 1 converts this from api-client.js:72");
  }
}


export interface RequestOptions {
  method?: string;
  headers?: HeadersInit;
  body?: unknown;
  /** false skips the Authorization header - used by login and register. */
  auth?: boolean;
  /** false suppresses the ocsp:authorization-error event on 401/403. */
  announceAuthorizationError?: boolean;
}

export class ApiClient {
  public readonly endpoints: ApiEndpoints = endpoints;

  constructor(protected readonly config: AppConfig) {}

  setAccessToken(_token: string): void {
    throw new Error("ApiClient.setAccessToken - Member 1, from api-client.js:83");
  }

  clearAccessToken(): void {
    throw new Error("ApiClient.clearAccessToken - Member 1, from api-client.js:276");
  }

  getAccessToken(): string {
    throw new Error("ApiClient.getAccessToken - Member 1, from api-client.js:87");
  }

  /** Turns a relative attachment path into an absolute URL. api-client.js:142 */
  resolveApiAssetUrl(_path: string): string {
    throw new Error("ApiClient.resolveApiAssetUrl - Member 1, from api-client.js:142");
  }

  request<T>(_path: string, _options?: RequestOptions): Promise<T> {
    throw new Error("ApiClient.request - Member 1, from api-client.js:172");
  }

  get<T>(_path: string, _options?: RequestOptions): Promise<T> {
    throw new Error("ApiClient.get - Member 1, from api-client.js:279");
  }

  post<T>(_path: string, _body?: unknown, _options?: RequestOptions): Promise<T> {
    throw new Error("ApiClient.post - Member 1, from api-client.js:280");
  }

  put<T>(_path: string, _body?: unknown, _options?: RequestOptions): Promise<T> {
    throw new Error("ApiClient.put - Member 1, from api-client.js:281");
  }

  patch<T>(_path: string, _body?: unknown, _options?: RequestOptions): Promise<T> {
    throw new Error("ApiClient.patch - Member 1, from api-client.js:282");
  }

  delete<T>(_path: string, _options?: RequestOptions): Promise<T> {
    throw new Error("ApiClient.delete - Member 1, from api-client.js:283");
  }
}
