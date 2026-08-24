(function initializeOcspApiClient(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const config = ocsp.config || {};

  const endpoints = Object.freeze({
    login: "/user/login",
    myIssues: "/issue/GetMyIssues",
    issueById: (issueId) => `/issue/GetIssueById/${issueId}`,
    createIssue: "/issue/Create",
    categories: "/category/GetAllCategories",
    regions: "/region/GetAll",
    commentsByIssue: (issueId) => `/comment/issue/${issueId}`,
    createComment: "/comment/newComment",
    attachmentsByIssue: (issueId) => `/attachment/Issue/${issueId}`,
    ratingsByIssue: (issueId) => `/rating/GetByIssueId/${issueId}`,
    createRating: "/rating/Create",
    myNotifications: "/notification/my",
    unreadNotifications: "/notification/my/unread"
  });

  class ApiError extends Error {
    constructor(message, status, details) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.details = details;
    }
  }

  let accessToken = "";

  function setAccessToken(token) {
    accessToken = typeof token === "string" ? token.trim() : "";
  }

  function getAccessToken() {
    return accessToken;
  }

  function normalizeErrorMessage(payload, fallback) {
    if (typeof payload === "string" && payload.trim()) {
      return payload;
    }

    if (payload && typeof payload.message === "string") {
      return payload.message;
    }

    if (payload && payload.errors && typeof payload.errors === "object") {
      const messages = Object.values(payload.errors).flat().filter(Boolean);
      if (messages.length) {
        return messages.join(" ");
      }
    }

    return fallback;
  }

  async function parseResponse(response) {
    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (_error) {
      return text;
    }
  }

  async function request(path, options) {
    if (!config.apiBaseUrl) {
      throw new ApiError(
        "The API data source is disabled. Set an API base URL only when backend integration is intentionally enabled.",
        0,
        null
      );
    }

    const requestOptions = options || {};
    const controller = new AbortController();
    const timeoutId = global.setTimeout(
      () => controller.abort(),
      config.requestTimeoutMs || 12000
    );
    const token = getAccessToken();
    const headers = new Headers(requestOptions.headers || {});

    headers.set("Accept", "application/json");
    if (requestOptions.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    try {
      const response = await global.fetch(`${config.apiBaseUrl}${path}`, {
        method: requestOptions.method || "GET",
        headers,
        body:
          requestOptions.body === undefined
            ? undefined
            : JSON.stringify(requestOptions.body),
        signal: controller.signal
      });
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new ApiError(
          normalizeErrorMessage(payload, `Request failed with status ${response.status}.`),
          response.status,
          payload
        );
      }

      return payload;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new ApiError("The request timed out.", 0, null);
      }
      throw error;
    } finally {
      global.clearTimeout(timeoutId);
    }
  }

  ocsp.apiClient = Object.freeze({
    endpoints,
    request,
    setAccessToken,
    clearAccessToken: () => setAccessToken(""),
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
    put: (path, body) => request(path, { method: "PUT", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    delete: (path) => request(path, { method: "DELETE" })
  });
  ocsp.ApiError = ApiError;

  global.OCSP = ocsp;
})(window);
