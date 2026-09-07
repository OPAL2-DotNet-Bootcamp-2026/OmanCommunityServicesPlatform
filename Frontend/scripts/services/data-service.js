(function initializeOcspDataService(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const config = ocsp.config || {};
  const parseApiDate = typeof config.parseApiDate === "function"
    ? config.parseApiDate
    : (value) => new Date(value);
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

  // Status history is staff-only, but the citizen already receives a linked
  // StatusChange notification. Use that existing response to drive V5's card
  // ribbon without adding another request or changing the backend contract.
  function portalDateKey(value) {
    const date = parseApiDate(value);
    if (Number.isNaN(date.getTime())) return "";

    try {
      const values = {};
      new Intl.DateTimeFormat("en-US", {
        timeZone: config.timeZone || "Asia/Muscat",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(date).forEach((part) => {
        if (part.type !== "literal") values[part.type] = part.value;
      });
      return `${values.year}-${values.month}-${values.day}`;
    } catch (_error) {
      return date.toISOString().slice(0, 10);
    }
  }

  function decorateIssuesWithFreshUpdates(issues, notifications) {
    const latestByIssue = new Map();

    asArray(notifications).forEach((notification) => {
      if (String(notification && notification.type || "").toLowerCase() !== "statuschange") {
        return;
      }

      const issueId = Number(notification.issueId);
      const createdTime = parseApiDate(notification.createdAt).getTime();
      if (!Number.isInteger(issueId) || issueId < 1 || !Number.isFinite(createdTime)) {
        return;
      }

      const current = latestByIssue.get(issueId);
      if (!current || createdTime > current.createdTime) {
        latestByIssue.set(issueId, { notification, createdTime });
      }
    });

    const todayKey = portalDateKey(new Date());
    return asArray(issues).map((issue) => {
      const latest = latestByIssue.get(Number(issue.issueId));
      if (!latest) return issue;

      const notification = latest.notification;
      const updatedToday = portalDateKey(notification.createdAt) === todayKey;
      if (notification.isRead && !updatedToday) return issue;

      // Use one concise label for every recent status-change ribbon.
      const freshUpdateLabel = "New update";
      return {
        ...issue,
        ui: {
          ...(issue.ui || {}),
          hasFreshUpdate: true,
          freshUpdateLabel,
          freshUpdateAt: notification.createdAt,
          freshUpdateNotificationId: Number(notification.notificationId) || null
        }
      };
    });
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
    // Start all independent requests together. Issues remain essential, while
    // lookup and notification failures leave the user's issue list usable.
    const results = await Promise.allSettled([
      api.get(api.endpoints.myIssues),
      api.get(api.endpoints.categories),
      api.get(api.endpoints.regions),
      api.get(api.endpoints.myNotifications)
    ]);
    if (results[0].status === "rejected") {
      throw results[0].reason;
    }

    const issues = asArray(results[0].value);
    const categories = asArray(settledValue(results[1], []));
    const regions = asArray(settledValue(results[2], []));
    const notifications = asArray(settledValue(results[3], []));

    return {
      currentUser: currentUser(),
      notifications,
      categories,
      regions,
      issues: decorateIssuesWithFreshUpdates(
        issues.map((issue) => normalizeIssue(issue, categories, regions)),
        notifications
      ),
      warnings: rejectedSections(results.slice(1), ["categories", "regions", "notifications"])
    };
  }

  async function getIssueAttachments(issueId) {
    const attachments = await api.get(api.endpoints.attachmentsByIssue(Number(issueId)));
    return asArray(attachments).map(normalizeApiAttachment);
  }

  async function getIssueDetails(issueId) {
    const issue = await api.get(api.endpoints.issueById(issueId));
    const results = await Promise.allSettled([
      api.get(api.endpoints.commentsByIssue(issueId)),
      getIssueAttachments(issueId),
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
      attachments: asArray(settledValue(results[1], [])),
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

  // Attachments use their own backend endpoint because an issue ID must exist
  // before the image URL can be associated with the new database record.
  async function createAttachment(payload) {
    const attachment = await api.post(api.endpoints.createAttachment, {
      issueId: Number(payload.issueId),
      fileUrl: String(payload.fileUrl || "").trim(),
      fileType: String(payload.fileType || "Image")
    });
    return normalizeApiAttachment(attachment);
  }

  // Citizens can replace the URL of an attachment they originally uploaded.
  async function updateAttachment(attachmentId, payload) {
    const attachment = await api.put(
      api.endpoints.updateAttachment(Number(attachmentId)),
      {
        fileUrl: String(payload.fileUrl || "").trim(),
        fileType: String(payload.fileType || "Image")
      }
    );
    return normalizeApiAttachment(attachment);
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
    getIssueAttachments,
    getIssueDetails,
    createIssue,
    createAttachment,
    updateAttachment,
    addComment,
    saveRating
  });

  global.OCSP = ocsp;
})(window);
