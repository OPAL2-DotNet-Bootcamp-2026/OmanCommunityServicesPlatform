import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { type LoginResponse } from "../models/user.model";
import { SessionService } from "./session.service";

/** A JWT-shaped token whose payload expires `secondsFromNow` from now. Only the payload is read. */
function tokenExpiringIn(secondsFromNow: number): string {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsFromNow }));
  return `header.${payload.replace(/=+$/, "")}.signature`;
}

function login(role: string, secondsFromNow = 3600): LoginResponse {
  return { Token: tokenExpiringIn(secondsFromNow), userId: 7, name: "Noor Al Harthi", role } as LoginResponse;
}

describe("SessionService", () => {
  let session: SessionService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(SessionService);
  });

  it("starts a session from the login response and keeps it in sessionStorage", () => {
    session.start(login("Citizen"));
    expect(session.getUser()?.name).toBe("Noor Al Harthi");
    expect(session.currentUser()?.role).toBe("Citizen");
    expect(sessionStorage.getItem("ocsp.session")).toContain("Noor Al Harthi");
  });

  it("treats an expired token as signed out", () => {
    session.start(login("Citizen", -60));
    expect(session.getSession()).toBeNull();
    expect(sessionStorage.getItem("ocsp.session")).toBeNull();
  });

  it("refuses a login response without a token", () => {
    expect(() => session.start({ userId: 7, name: "X", role: "Citizen" })).toThrow(/access token/);
  });

  describe("safeReturnTo", () => {
    it("accepts a known page the role may open, keeping the query", () => {
      expect(session.safeReturnTo("/my-issues?issueId=5", "Citizen")).toBe("/my-issues?issueId=5");
    });

    it("rejects a page the role may not open", () => {
      expect(session.safeReturnTo("/dashboard", "Citizen")).toBe("");
    });

    it.each(["https://evil.example/my-issues", "//evil.example/my-issues", "javascript:alert(1)", "/\\evil", "/unknown-page"])(
      "rejects %s",
      (target) => expect(session.safeReturnTo(target, "Citizen")).toBe("")
    );
  });

  it("sends each role to its own home page", () => {
    expect(session.roleHome("Citizen")).toBe("/my-issues");
    expect(session.roleHome("Staff")).toBe("/dashboard");
    expect(session.roleHome("Admin")).toBe("/dashboard");
  });

  it("hands a flash message to the next page once", () => {
    session.setFlash({ message: "Signed in successfully.", tone: "success" });
    expect(session.consumeFlash()?.message).toBe("Signed in successfully.");
    expect(session.consumeFlash()).toBeNull();
  });
});
