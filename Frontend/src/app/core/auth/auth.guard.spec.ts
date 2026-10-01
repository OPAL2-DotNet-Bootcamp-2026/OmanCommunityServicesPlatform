import { TestBed } from "@angular/core/testing";
import { type ActivatedRouteSnapshot, type RouterStateSnapshot, Router, UrlTree, provideRouter } from "@angular/router";
import { type LoginResponse } from "../models/user.model";
import { guestOnlyGuard, signedInGuard } from "./auth.guard";
import { SessionService } from "./session.service";

const validToken = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=+$/, "")}.signature`;

function signInAs(role: string): void {
  TestBed.inject(SessionService).start({ Token: validToken, userId: 1, name: "Test User", role } as LoginResponse);
}

function runSignedInGuard(roles: string[], url: string): ReturnType<typeof signedInGuard> {
  const route = { data: { roles } } as unknown as ActivatedRouteSnapshot;
  const state = { url } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => signedInGuard(route, state));
}

describe("route guards", () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it("sends a signed-out visitor to sign in, remembering where they were going", () => {
    const result = runSignedInGuard(["Citizen"], "/my-issues?issueId=3");
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe("/login?returnTo=%2Fmy-issues%3FissueId%3D3");
  });

  it("lets a user with the right role in", () => {
    signInAs("Citizen");
    expect(runSignedInGuard(["Citizen"], "/my-issues")).toBe(true);
  });

  it("sends a user with the wrong role to their own home page", () => {
    signInAs("Citizen");
    const result = runSignedInGuard(["Staff", "Admin"], "/dashboard");
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe("/my-issues");
  });

  it("keeps a signed-in user away from sign-in and registration", () => {
    signInAs("Staff");
    const route = {} as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => guestOnlyGuard(route, {} as RouterStateSnapshot));
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe("/dashboard");
  });
});
