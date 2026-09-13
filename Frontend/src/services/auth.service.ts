/**
 * Member 2 - convert from scripts/services/auth-service.js (48 lines).
 *
 * The smallest service, and a good one to do straight after session.service.ts
 * because it shows the constructor-injection pattern with two dependencies and
 * almost no logic in between.
 *
 * Two things to keep:
 *   - both calls pass auth: false and announceAuthorizationError: false. A 401
 *     from login means "wrong password", not "session expired", and must not
 *     trigger the global sign-out listener.
 *   - register() deliberately sends regionId: null. The backend guards its
 *     region lookup, and RegisterUserDto allows null for anonymous sign-up.
 */
import type { ApiClient } from "../core/api-client";
import type { LoginRequest, RegisterRequest, User } from "../models";
import type { Session, SessionService } from "./session.service";

export class AuthService {
  constructor(
    protected readonly api: ApiClient,
    protected readonly session: SessionService
  ) {}

  /** Posts credentials, then hands the response to SessionService.start(). */
  login(_credentials: LoginRequest): Promise<Session> {
    throw new Error("AuthService.login - Member 2, from auth-service.js:16");
  }

  register(_payload: RegisterRequest): Promise<User> {
    throw new Error("AuthService.register - Member 2, from auth-service.js:29");
  }

  logout(): void {
    throw new Error("AuthService.logout - Member 2, from auth-service.js:44");
  }
}
