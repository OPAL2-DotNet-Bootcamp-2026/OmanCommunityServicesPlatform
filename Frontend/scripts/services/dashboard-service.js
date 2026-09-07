(function initializeOcspDashboardService(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const api = ocsp.apiClient;
  const session = ocsp.sessionService;

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function actor() {
    const user = session && session.getUser();
    if (!user || !["Staff", "Admin"].includes(user.role)) {
      throw new Error("A Staff or Admin session is required for the dashboard.");
    }
    return user;
  }

  function settledValue(result, fallback) {
    return result.status === "fulfilled" ? result.value : fallback;
  }

  // Supporting requests fail independently; expose the affected section names
  // instead of replacing a valid issue list with an all-page error.
  function rejectedSections(results, labels) {
    return results
      .map((result, index) => result.status === "rejected" ? labels[index] : null)
      .filter(Boolean);
  }

  function normalizeApiIssue(issue) {
    const value = issue && typeof issue === "object" ? issue : {};
    return {
      ...value,
      ui: {
        imageUrl: "",
        imageAlt: "",
        imageStyle: "document",
        previewLabel: "Issue attachment",
        mapAreaName: value.regionName || "Issue location",
        mapVariant: "city",
        hasFreshUpdate: false
      }
    };
  }

  function normalizeApiAttachment(attachment) {
    const value = attachment && typeof attachment === "object" ? attachment : {};
    return {
      ...value,
      fileUrl: api.resolveApiAssetUrl(value.fileUrl),
      label: `Attachment ${value.attachmentId || ""}`.trim(),
      style: "document"
    };
  }

  // Issue list responses do not contain attachments. Load them separately so
  // card previews can be hydrated without changing the backend contract.
  async function getStaffIssueAttachments(issueId) {
    const attachments = await api.get(
      api.endpoints.attachmentsByIssue(Number(issueId))
    );
    return asArray(attachments).map(normalizeApiAttachment);
  }

  async function getStaffDashboardData() {
    const results = await Promise.allSettled([
      api.get(api.endpoints.allIssues),
      api.get(api.endpoints.categories),
      api.get(api.endpoints.regions),
      api.get(api.endpoints.departments),
      api.get(api.endpoints.myNotifications),
      api.get(api.endpoints.allStatusUpdates)
    ]);

    // The issue collection is the primary dashboard resource.
    if (results[0].status === "rejected") {
      throw results[0].reason;
    }

    return {
      currentUser: { ...actor() },
      issues: asArray(results[0].value).map(normalizeApiIssue),
      categories: asArray(settledValue(results[1], [])),
      regions: asArray(settledValue(results[2], [])),
      departments: asArray(settledValue(results[3], [])),
      notifications: asArray(settledValue(results[4], [])),
      statusUpdates: asArray(settledValue(results[5], [])),
      warnings: rejectedSections(
        results.slice(1),
        ["categories", "regions", "departments", "notifications", "status history"]
      )
    };
  }

  async function getStaffIssueDetails(issueId) {
    const results = await Promise.allSettled([
      api.get(api.endpoints.issueById(issueId)),
      api.get(api.endpoints.commentsByIssue(issueId)),
      getStaffIssueAttachments(issueId),
      api.get(api.endpoints.statusUpdatesByIssue(issueId)),
      api.get(api.endpoints.ratingsByIssue(issueId))
    ]);

    if (results[0].status === "rejected") {
      throw results[0].reason;
    }

    const issue = normalizeApiIssue(results[0].value);
    const ratings = asArray(settledValue(results[4], []))
      .slice()
      .sort((left, right) => new Date(right.ratedAt).getTime() - new Date(left.ratedAt).getTime());
    const reporterRating = ratings.find(
      (rating) => Number(rating.userId) === Number(issue.reportedById)
    ) || null;

    return {
      ...issue,
      comments: asArray(settledValue(results[1], [])),
      attachments: asArray(settledValue(results[2], [])),
      statusUpdates: asArray(settledValue(results[3], []))
        .sort((left, right) => new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()),
      ratings,
      rating: reporterRating,
      warnings: rejectedSections(
        results.slice(1),
        ["comments", "attachments", "activity timeline", "ratings"]
      )
    };
  }

  function changeIssueStatus(issueId, payload) {
    return api.put(api.endpoints.changeIssueStatus(issueId), {
      newStatus: String(payload.newStatus || ""),
      notes: String(payload.notes || "").trim() || null
    });
  }

  function addStaffComment(issueId, content) {
    return api.post(api.endpoints.createComment, {
      issueId: Number(issueId),
      content: String(content || "").trim()
    });
  }

  function requireAdmin() {
    if (actor().role !== "Admin") {
      throw new Error("Only an Admin can change platform setup.");
    }
  }

  function createRegion(payload) {
    requireAdmin();
    return api.post(api.endpoints.createRegion, payload);
  }

  function createDepartment(payload) {
    requireAdmin();
    return api.post(api.endpoints.createDepartment, payload);
  }

  function createCategory(payload) {
    requireAdmin();
    return api.post(api.endpoints.createCategory, payload);
  }

  ocsp.dashboardService = Object.freeze({
    getStaffDashboardData,
    getStaffIssueAttachments,
    getStaffIssueDetails,
    changeIssueStatus,
    addStaffComment,
    createRegion,
    createDepartment,
    createCategory
  });

  global.OCSP = ocsp;
})(window);
