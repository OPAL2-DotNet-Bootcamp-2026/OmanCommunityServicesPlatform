/**
 * Sign-in and registration. Authentication is API-only; the returned JWT is
 * persisted by SessionService and attached to later protected requests.
 */
import type { ApiClient } from "../core/api-client";
import type { LoginRequest, LoginResponse, RegisterRequest, User } from "../models";
import type { Session, SessionService } from "./session.service";

function normalizeEmail(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export class AuthService {
  constructor(
    private readonly api: ApiClient,
    private readonly session: SessionService
  ) {}

  /**
   * auth:false and announceAuthorizationError:false are deliberate - a 401 here
   * means "wrong password", not "session expired", and must not trigger the
   * global sign-out listener.
   */
  async login(credentials: LoginRequest): Promise<Session> {
    const response = await this.api.post<LoginResponse>(
      this.api.endpoints.login,
      {
        email: normalizeEmail(credentials.email),
        password: String(credentials.password ?? "")
      },
      { auth: false, announceAuthorizationError: false }
    );

    return this.session.start(response);
  }

  /**
   * regionId is intentionally null: the backend protects its region lookup, and
   * RegisterUserDto allows a null region for anonymous sign-up.
   */
  register(payload: RegisterRequest): Promise<User> {
    return this.api.post<User>(
      this.api.endpoints.register,
      {
        name: String(payload.name ?? "").trim(),
        email: normalizeEmail(payload.email),
        password: String(payload.password ?? ""),
        phoneNumber: String(payload.phoneNumber ?? "").trim() || null,
        regionId: null
      },
      { auth: false, announceAuthorizationError: false }
    );
  }
}
