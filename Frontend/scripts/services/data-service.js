(function initializeOcspDataService(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const api = ocsp.apiClient;
  const session = ocsp.sessionService;

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function currentUser() {
    return session && session.getUser() ? session.getUser() : null;
  }

  function settledValue(result, fallback) {
    return result.status === "fulfilled" ? result.value : fallback;
  }

  // Optional API sections are isolated so a comments or attachment outage does
  // not hide the issue itself. The page receives explicit warning labels.
  function rejectedSections(results, labels) {
    return results
      .map((result, index) => result.status === "rejected" ? labels[index] : null)
      .filter(Boolean);
  }

  function normalizeApiAttachment(attachment) {
    const value = attachment && typeof attachment === "object" ? attachment : {};
    return {
      ...value,
      fileUrl: api.resolveApiAssetUrl(value.fileUrl)
    };
  }

  function normalizeIssue(issue, categories, regions) {
    const value = issue && typeof issue === "object" ? issue : {};
    const category = asArray(categories).find(
      (item) => item.categoryName === value.categoryName
    );
    const region = asArray(regions).find(
      (item) => item.regionName === value.regionName
    );

    return {
      ...value,
      categoryId: value.categoryId || (category ? category.categoryId : null),
      regionId: value.regionId || (region ? region.regionId : null),
      governorate: value.governorate || (region ? region.governorate : ""),
      attachments: asArray(value.attachments),
      comments: asArray(value.comments),
      // The backend restricts detailed status history to Staff/Admin users.
      // Citizens see the real currentStatus and reportedDate from the issue DTO.
      statusUpdates: [],
      rating: value.rating || null,
      ui: value.ui || {}
    };
  }

  async function getNotifications() {
    return asArray(await api.get(api.endpoints.myNotifications));
  }

  async function getUnreadNotifications() {
    return asArray(await api.get(api.endpoints.unreadNotifications));
  }

  async function markNotificationAsRead(notificationId) {
    await api.patch(api.endpoints.markNotificationRead(notificationId));
    return true;
  }

  async function updateNotificationReadStatus(notificationId, isRead) {
    await api.patch(api.endpoints.updateNotificationReadStatus(notificationId), {
      isRead: Boolean(isRead)
    });
    return true;
  }

  async function getDashboardData() {
    // Issues are the essential request. Lookup and notification failures are
    // reported separately while the user's real issue list remains usable.
    const issues = asArray(await api.get(api.endpoints.myIssues));
    const results = await Promise.allSettled([
      api.get(api.endpoints.categories),
      api.get(api.endpoints.regions),
      api.get(api.endpoints.myNotifications)
    ]);
    const categories = asArray(settledValue(results[0], []));
    const regions = asArray(settledValue(results[1], []));
    const notifications = asArray(settledValue(results[2], []));

    return {
      currentUser: currentUser(),
      notifications,
      categories,
      regions,
      issues: issues.map((issue) => normalizeIssue(issue, categories, regions)),
      warnings: rejectedSections(results, ["categories", "regions", "notifications"])
    };
  }

  async function getIssueDetails(issueId) {
    const issue = await api.get(api.endpoints.issueById(issueId));
    const results = await Promise.allSettled([
      api.get(api.endpoints.commentsByIssue(issueId)),
      api.get(api.endpoints.attachmentsByIssue(issueId)),
      api.get(api.endpoints.ratingsByIssue(issueId))
    ]);
    const ratings = asArray(settledValue(results[2], []));
    const user = currentUser();
    const userId = Number(user && user.userId);
    const ownRating = ratings.find(
      (rating) => Number(rating.userId) === userId
    ) || null;

    return {
      ...normalizeIssue(issue, [], []),
      comments: asArray(settledValue(results[0], [])),
      attachments: asArray(settledValue(results[1], [])).map(normalizeApiAttachment),
      rating: ownRating,
      warnings: rejectedSections(results, ["comments", "attachments", "ratings"])
    };
  }

  async function createIssue(payload) {
    const issue = await api.post(api.endpoints.createIssue, payload);
    return normalizeIssue({
      ...issue,
      categoryId: Number(payload.categoryId) || null,
      regionId: Number(payload.regionId) || null
    }, [], []);
  }

  function addComment(issueId, content) {
    return api.post(api.endpoints.createComment, {
      issueId: Number(issueId),
      content: String(content || "").trim()
    });
  }

  async function saveRating(ratingId, issueId, score, feedback) {
    const payload = {
      score: Number(score),
      feedback: String(feedback || "").trim() || null
    };
    const response = ratingId
      ? await api.put(api.endpoints.updateRating(ratingId), payload)
      : await api.post(api.endpoints.createRating, {
          issueId: Number(issueId),
          ...payload
        });

    return response && response.rating ? response.rating : response;
  }

  ocsp.dataService = Object.freeze({
    getNotifications,
    getUnreadNotifications,
    markNotificationAsRead,
    updateNotificationReadStatus,
    getDashboardData,
    getIssueDetails,
    createIssue,
    addComment,
    saveRating
  });

  global.OCSP = ocsp;
})(window);
