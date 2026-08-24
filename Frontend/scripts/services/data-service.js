(function initializeOcspDataService(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const config = ocsp.config || {};
  const api = ocsp.apiClient;

  function clone(value) {
    if (value === undefined) {
      return undefined;
    }

    if (typeof global.structuredClone === "function") {
      return global.structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function nextId(values, key, fallback) {
    const ids = asArray(values)
      .map((item) => Number(item[key]))
      .filter(Number.isFinite);
    return ids.length ? Math.max(...ids) + 1 : fallback;
  }

  function getStoredSessionUser() {
    const sessionUser = ocsp.sessionService && ocsp.sessionService.getUser();
    if (sessionUser) {
      return clone(sessionUser);
    }

    return {
      userId: 0,
      name: "Citizen",
      role: "Citizen",
      isActive: true
    };
  }

  function syntheticTimeline(issue) {
    const updates = [
      {
        statusUpdateId: `reported-${issue.issueId}`,
        issueId: issue.issueId,
        updatedById: issue.reportedById,
        previousStatus: null,
        newStatus: "Open",
        notes: "Issue Submitted",
        updatedAt: issue.reportedDate
      }
    ];

    if (issue.currentStatus !== "Open") {
      updates.push({
        statusUpdateId: `current-${issue.issueId}`,
        issueId: issue.issueId,
        updatedById: null,
        previousStatus: "Open",
        newStatus: issue.currentStatus,
        notes: "Current Status",
        updatedAt: null
      });
    }

    return updates;
  }

  const mockState = clone(ocsp.mockData || {});

  function getMockActor() {
    const sessionUser = getStoredSessionUser();
    return sessionUser.userId ? sessionUser : clone(mockState.currentUser);
  }

  function composeMockIssue(issue) {
    const category = asArray(mockState.categories).find(
      (item) => item.categoryName === issue.categoryName
    );
    const region = asArray(mockState.regions).find(
      (item) => item.regionName === issue.regionName
    );

    return {
      ...clone(issue),
      categoryId: category ? category.categoryId : null,
      regionId: region ? region.regionId : null,
      governorate: region ? region.governorate : "",
      attachments: clone(mockState.attachmentsByIssueId[issue.issueId] || []),
      comments: clone(mockState.commentsByIssueId[issue.issueId] || []),
      statusUpdates: clone(mockState.statusUpdatesByIssueId[issue.issueId] || []),
      rating: clone(mockState.ratingsByIssueId[issue.issueId] || null)
    };
  }

  const mockSource = {
    async getNotifications() {
      return clone(asArray(mockState.notifications)).sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    },

    async getUnreadNotifications() {
      return clone(asArray(mockState.notifications).filter((notification) => !notification.isRead));
    },

    async markNotificationAsRead(notificationId) {
      const notification = asArray(mockState.notifications).find(
        (item) => Number(item.notificationId) === Number(notificationId)
      );
      if (!notification) {
        throw new Error("The selected notification could not be found.");
      }
      notification.isRead = true;
      return clone(notification);
    },

    async updateNotificationReadStatus(notificationId, isRead) {
      if (typeof isRead !== "boolean") {
        throw new Error("A valid notification read status is required.");
      }
      const notification = asArray(mockState.notifications).find(
        (item) => Number(item.notificationId) === Number(notificationId)
      );
      if (!notification) {
        throw new Error("The selected notification could not be found.");
      }
      notification.isRead = isRead;
      return clone(notification);
    },

    async getDashboardData() {
      return {
        currentUser: clone(getMockActor()),
        notifications: clone(asArray(mockState.notifications)),
        categories: clone(asArray(mockState.categories)),
        regions: clone(asArray(mockState.regions)),
        issues: asArray(mockState.issues).map(composeMockIssue)
      };
    },

    async getIssueDetails(issueId) {
      const issue = asArray(mockState.issues).find(
        (item) => Number(item.issueId) === Number(issueId)
      );

      if (!issue) {
        throw new Error("The selected issue could not be found.");
      }

      return composeMockIssue(issue);
    },

    async createIssue(payload) {
      const category = asArray(mockState.categories).find(
        (item) => Number(item.categoryId) === Number(payload.categoryId)
      );
      const region = asArray(mockState.regions).find(
        (item) => Number(item.regionId) === Number(payload.regionId)
      );

      if (!category || !region) {
        throw new Error("Select a valid category and region.");
      }

      const issueId = nextId(mockState.issues, "issueId", 1);
      const reportedDate = new Date().toISOString();
      const issue = {
        issueId,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        latitude: payload.latitude,
        longitude: payload.longitude,
        priority: payload.priority,
        currentStatus: "Open",
        reportedDate,
        reportedById: getMockActor().userId,
        categoryName: category.categoryName,
        regionName: region.regionName,
        assignedDepartmentName: category.departmentName || null,
        ui: {
          imageUrl: "",
          imageAlt: "",
          mapAreaName: region.regionName,
          mapVariant: "city",
          hasFreshUpdate: false
        }
      };

      mockState.issues.unshift(issue);
      mockState.attachmentsByIssueId[issueId] = [];
      mockState.commentsByIssueId[issueId] = [];
      mockState.statusUpdatesByIssueId[issueId] = [
        {
          statusUpdateId: nextId(
            Object.values(mockState.statusUpdatesByIssueId).flat(),
            "statusUpdateId",
            1
          ),
          issueId,
          updatedById: getMockActor().userId,
          previousStatus: null,
          newStatus: "Open",
          notes: "Issue Submitted",
          updatedAt: reportedDate
        }
      ];
      mockState.ratingsByIssueId[issueId] = null;

      return composeMockIssue(issue);
    },

    async addComment(issueId, content) {
      const comments = mockState.commentsByIssueId[issueId] || [];
      const allComments = Object.values(mockState.commentsByIssueId).flat();
      const comment = {
        commentId: nextId(allComments, "commentId", 1),
        issueId: Number(issueId),
        userId: getMockActor().userId,
        userName: getMockActor().name,
        content,
        isStaffComment: false,
        commentDate: new Date().toISOString()
      };

      comments.push(comment);
      mockState.commentsByIssueId[issueId] = comments;
      return clone(comment);
    },

    async submitRating(issueId, score, feedback) {
      const issue = asArray(mockState.issues).find(
        (item) => Number(item.issueId) === Number(issueId)
      );

      if (!issue || issue.currentStatus !== "Resolved") {
        throw new Error("Only resolved issues can be rated.");
      }

      const ratings = Object.values(mockState.ratingsByIssueId).filter(Boolean);
      const rating = {
        ratingId: nextId(ratings, "ratingId", 1),
        issueId: Number(issueId),
        userId: getMockActor().userId,
        score: Number(score),
        feedback: feedback || null,
        ratedAt: new Date().toISOString()
      };

      mockState.ratingsByIssueId[issueId] = rating;
      return clone(rating);
    }
  };

  function settledValue(result, fallback) {
    return result.status === "fulfilled" ? result.value : fallback;
  }

  function normalizeApiAttachment(attachment) {
    return {
      ...attachment,
      fileUrl: api.resolveApiAssetUrl(attachment && attachment.fileUrl)
    };
  }

  const apiSource = {
    async getNotifications() {
      return asArray(await api.get(api.endpoints.myNotifications));
    },

    async getUnreadNotifications() {
      return asArray(await api.get(api.endpoints.unreadNotifications));
    },

    async markNotificationAsRead(notificationId) {
      await api.patch(api.endpoints.markNotificationRead(notificationId));
      return true;
    },

    async updateNotificationReadStatus(notificationId, isRead) {
      await api.patch(api.endpoints.updateNotificationReadStatus(notificationId), {
        isRead: Boolean(isRead)
      });
      return true;
    },

    async getDashboardData() {
      // The issue list is essential; lookups and notification counts may recover
      // independently so one optional endpoint cannot blank the complete page.
      const issues = asArray(await api.get(api.endpoints.myIssues));
      const [categoriesResult, regionsResult, notificationsResult] = await Promise.allSettled([
        api.get(api.endpoints.categories),
        api.get(api.endpoints.regions),
        api.get(api.endpoints.myNotifications)
      ]);
      const safeCategories = asArray(settledValue(categoriesResult, []));
      const safeRegions = asArray(settledValue(regionsResult, []));
      const notifications = asArray(settledValue(notificationsResult, []));
      const enrichedIssues = issues.map((issue) => {
        const category = safeCategories.find(
          (item) => item.categoryName === issue.categoryName
        );
        const region = safeRegions.find(
          (item) => item.regionName === issue.regionName
        );

        return {
          ...issue,
          categoryId: category ? category.categoryId : null,
          regionId: region ? region.regionId : null,
          governorate: region ? region.governorate : "",
          attachments: [],
          comments: [],
          // Citizen status history is not exposed by the current API contract.
          statusUpdates: syntheticTimeline(issue),
          rating: null,
          ui: {}
        };
      });

      return {
        currentUser: getStoredSessionUser(),
        notifications,
        categories: safeCategories,
        regions: safeRegions,
        issues: enrichedIssues
      };
    },

    async getIssueDetails(issueId) {
      const issue = await api.get(api.endpoints.issueById(issueId));
      const [commentsResult, attachmentsResult, ratingsResult] = await Promise.allSettled([
        api.get(api.endpoints.commentsByIssue(issueId)),
        api.get(api.endpoints.attachmentsByIssue(issueId)),
        api.get(api.endpoints.ratingsByIssue(issueId))
      ]);
      const comments = asArray(settledValue(commentsResult, []));
      const attachments = asArray(settledValue(attachmentsResult, []))
        .map(normalizeApiAttachment);
      const ratings = asArray(settledValue(ratingsResult, []));

      return {
        ...issue,
        comments,
        attachments,
        statusUpdates: syntheticTimeline(issue),
        rating: ratings[0] || null,
        ui: {}
      };
    },

    createIssue(payload) {
      return api.post(api.endpoints.createIssue, payload);
    },

    addComment(issueId, content) {
      return api.post(api.endpoints.createComment, {
        issueId: Number(issueId),
        content
      });
    },

    async submitRating(issueId, score, feedback) {
      const response = await api.post(api.endpoints.createRating, {
        issueId: Number(issueId),
        score: Number(score),
        feedback: feedback || null
      });
      return response && response.rating ? response.rating : response;
    }
  };
  const sources = Object.freeze({ mock: mockSource, api: apiSource });

  function getSource() {
    const source = sources[config.dataSource];
    if (!source) {
      throw new Error(`Unknown frontend data source: ${config.dataSource}`);
    }
    return source;
  }

  ocsp.dataService = Object.freeze({
    getNotifications: (...args) => getSource().getNotifications(...args),
    getUnreadNotifications: (...args) => getSource().getUnreadNotifications(...args),
    markNotificationAsRead: (...args) => getSource().markNotificationAsRead(...args),
    updateNotificationReadStatus: (...args) => getSource().updateNotificationReadStatus(...args),
    getDashboardData: (...args) => getSource().getDashboardData(...args),
    getIssueDetails: (...args) => getSource().getIssueDetails(...args),
    createIssue: (...args) => getSource().createIssue(...args),
    addComment: (...args) => getSource().addComment(...args),
    submitRating: (...args) => getSource().submitRating(...args)
  });

  global.OCSP = ocsp;
})(window);
