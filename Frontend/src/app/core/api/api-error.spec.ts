import { ApiError, apiErrorMessage, fallbackMessageFor } from "./api-error";

describe("apiErrorMessage", () => {
  it("uses a ProblemDetails detail, the specific reason", () => {
    expect(apiErrorMessage({ title: "Registration failed", detail: "Email is already registered." }, "x"))
      .toBe("Email is already registered.");
  });

  it("joins ASP.NET validation messages", () => {
    const payload = { title: "One or more validation errors occurred.", errors: { Email: ["Email is required."], Password: ["Too short."] } };
    expect(apiErrorMessage(payload, "x")).toBe("Email is required. Too short.");
  });

  it("uses a plain text body as it is", () => {
    expect(apiErrorMessage("Region not found", "x")).toBe("Region not found");
  });

  it("falls back when the body says nothing useful", () => {
    expect(apiErrorMessage(null, "The request failed.")).toBe("The request failed.");
    expect(apiErrorMessage({}, "The request failed.")).toBe("The request failed.");
  });

  it("has friendly wording for common statuses", () => {
    expect(fallbackMessageFor(401)).toMatch(/session has expired/);
    expect(fallbackMessageFor(429)).toMatch(/wait and try again/);
    expect(fallbackMessageFor(500)).toBe("Request failed with status 500.");
  });
});

describe("ApiError", () => {
  it("survives instanceof checks after transpiling", () => {
    const error: unknown = new ApiError("Not found", 404);
    expect(error instanceof ApiError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});
