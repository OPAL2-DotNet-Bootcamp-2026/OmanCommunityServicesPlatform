import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { type Observable, map } from "rxjs";
import { apiEndpoints } from "../api/api-endpoints";
import { signInRequestContext } from "../api/api-request-context";
import { type LoginRequest, type LoginResponse, type RegisterRequest, type User } from "../models/user.model";
import { type Session, SessionService } from "./session.service";

function normalizeEmail(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

/** Sign-in and registration. The JWT from sign-in is kept by SessionService. */
@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  login(credentials: LoginRequest): Observable<Session> {
    const body: LoginRequest = {
      email: normalizeEmail(credentials.email),
      password: String(credentials.password ?? "")
    };
    return this.http
      .post<LoginResponse>(apiEndpoints.login, body, { context: signInRequestContext() })
      .pipe(map((response) => this.session.start(response)));
  }

  /** regionId stays null: RegisterUserDto allows it, and the region list needs a token. */
  register(payload: RegisterRequest): Observable<User> {
    const body: RegisterRequest = {
      name: String(payload.name ?? "").trim(),
      email: normalizeEmail(payload.email),
      password: String(payload.password ?? ""),
      phoneNumber: String(payload.phoneNumber ?? "").trim() || null,
      regionId: null
    };
    return this.http.post<User>(apiEndpoints.register, body, { context: signInRequestContext() });
  }
}
