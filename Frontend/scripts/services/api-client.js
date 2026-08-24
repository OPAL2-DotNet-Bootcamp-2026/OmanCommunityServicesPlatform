(function initializeOcspApiClient(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const config = ocsp.config || {};

  // Keep every backend route in one place so page scripts never build URLs.
  const endpoints = Object.freeze({
    login: "/user/login",
    register: "/user/register",
    updateProfile: (userId) => `/user/${userId}/update-profile`,
    changeUserRole: "/user/change-role",
    assignUserDepartment: "/user/assign-department",
    deactivateUser: (userId) => `/user/${userId}/deactivate`,

    myIssues: "/issue/GetMyIssues",
    allIssues: "/issue/GetAllIssues",
    issueById: (issueId) => `/issue/GetIssueById/${issueId}`,
    createIssue: "/issue/Create",
    changeIssueStatus: (issueId) => `/issue/ChangeIssueStatus/${issueId}`,
    statusUpdatesByIssue: (issueId) => `/api/StatusUpdate/issue/${issueId}`,

    categories: "/category/GetAllCategories",
    categoryById: (categoryId) => `/category/GetCategoryById/${categoryId}`,
    createCategory: "/category/Add",
    updateCategory: (categoryId) => `/category/Update/${categoryId}`,
    deleteCategory: (categoryId) => `/category/Delete/${categoryId}`,

    regions: "/region/GetAll",
    regionById: (regionId) => `/region/GetById/${regionId}`,
    createRegion: "/region/Add",
    updateRegion: (regionId) => `/region/Update/${regionId}`,
    deleteRegion: (regionId) => `/region/Delete/${regionId}`,

    departments: "/department/GetAllDepartments",
    departmentById: (departmentId) => `/department/GetDepartmentById/${departmentId}`,
    createDepartment: "/department/Add",
    updateDepartment: (departmentId) => `/department/Update/${departmentId}`,
    deleteDepartment: (departmentId) => `/department/Delete/${departmentId}`,

    commentsByIssue: (issueId) => `/comment/issue/${issueId}`,
    createComment: "/comment/newComment",
    deleteComment: (commentId) => `/comment/${commentId}`,

    attachmentsByIssue: (issueId) => `/attachment/Issue/${issueId}`,
    createAttachment: "/attachment/Create",
    deleteAttachment: (attachmentId) => `/attachment/Delete/${attachmentId}`,

    ratingsByIssue: (issueId) => `/rating/GetByIssueId/${issueId}`,
    createRating: "/rating/Create",

    myNotifications: "/notification/my",
    unreadNotifications: "/notification/my/unread",
    markNotificationRead: (notificationId) => `/notification/${notificationId}/read`,
    updateNotificationReadStatus: (notificationId) => `/notification/${notificationId}/read-status`,
    deleteNotification: (notificationId) => `/notification/${notificationId}`
  });

  class ApiError extends Error {
    constructor(message, status, details) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.details = details;
    }
  }

  // The session service restores this value after every page navigation.
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

    if (payload && typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (payload && typeof payload.Message === "string" && payload.Message.trim()) {
      return payload.Message;
    }

    if (payload && payload.errors && typeof payload.errors === "object") {
      const messages = Object.values(payload.errors).flat().filter(Boolean);
      if (messages.length) {
        return messages.join(" ");
      }
    }

    if (payload && typeof payload.title === "string" && payload.title.trim()) {
      return payload.title;
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

  function buildApiUrl(path) {
    const candidate = String(path || "").trim();
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }

    return `${config.apiBaseUrl || ""}/${candidate.replace(/^\/+/, "")}`;
  }

  function resolveApiAssetUrl(path) {
    const candidate = String(path || "").trim();
    if (!candidate || /^(?:https?:)?\/\//i.test(candidate)) {
      return candidate;
    }

    if (!config.apiBaseUrl) {
      return candidate;
    }

    try {
      return new URL(candidate, `${config.apiBaseUrl}/`).href;
    } catch (_error) {
      return "";
    }
  }

  function isRawRequestBody(body) {
    return (
      (typeof global.FormData === "function" && body instanceof global.FormData) ||
      (typeof global.Blob === "function" && body instanceof global.Blob) ||
      (typeof global.URLSearchParams === "function" && body instanceof global.URLSearchParams) ||
      typeof body === "string"
    );
  }

  function announceAuthFailure(status, path) {
    if (![401, 403].includes(status) || typeof global.CustomEvent !== "function") {
      return;
    }

    global.dispatchEvent(new global.CustomEvent("ocsp:authorization-error", {
      detail: { status, path }
    }));
  }

  async function request(path, options) {
    if (!config.apiBaseUrl) {
      throw new ApiError(
        "The API data source is not configured. Keep mock mode enabled or provide the API base URL.",
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
    const hasBody = requestOptions.body !== undefined;
    const rawBody = hasBody && isRawRequestBody(requestOptions.body);

    headers.set("Accept", "application/json");
    if (hasBody && !rawBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token && requestOptions.auth !== false) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    try {
      const response = await global.fetch(buildApiUrl(path), {
        method: requestOptions.method || "GET",
        headers,
        body: hasBody
          ? rawBody
            ? requestOptions.body
            : JSON.stringify(requestOptions.body)
          : undefined,
        signal: controller.signal
      });
      const payload = await parseResponse(response);

      if (!response.ok) {
        const fallbackByStatus = {
          401: "Your session has expired. Please sign in again.",
          403: "You do not have permission to perform this action.",
          404: "The requested information could not be found.",
          429: "Too many requests were submitted. Please wait and try again."
        };
        const fallback = fallbackByStatus[response.status]
          || `Request failed with status ${response.status}.`;
        const details = {
          payload,
          retryAfter: response.headers.get("Retry-After")
        };

        if (requestOptions.announceAuthorizationError !== false) {
          announceAuthFailure(response.status, path);
        }
        throw new ApiError(
          normalizeErrorMessage(payload, fallback),
          response.status,
          details
        );
      }

      return payload;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new ApiError("The request timed out. Please try again.", 0, null);
      }
      if (error instanceof TypeError) {
        throw new ApiError(
          "The server could not be reached. Check the connection and try again.",
          0,
          error
        );
      }
      throw error;
    } finally {
      global.clearTimeout(timeoutId);
    }
  }

  function withMethod(method, path, body, options) {
    const requestOptions = { ...(options || {}), method };
    if (body !== undefined) {
      requestOptions.body = body;
    }
    return request(path, requestOptions);
  }

  ocsp.apiClient = Object.freeze({
    endpoints,
    request,
    setAccessToken,
    clearAccessToken: () => setAccessToken(""),
    getAccessToken,
    resolveApiAssetUrl,
    get: (path, options) => request(path, options),
    post: (path, body, options) => withMethod("POST", path, body, options),
    put: (path, body, options) => withMethod("PUT", path, body, options),
    patch: (path, body, options) => withMethod("PATCH", path, body, options),
    delete: (path, options) => withMethod("DELETE", path, undefined, options)
  });
  ocsp.ApiError = ApiError;

  global.OCSP = ocsp;
})(window);
