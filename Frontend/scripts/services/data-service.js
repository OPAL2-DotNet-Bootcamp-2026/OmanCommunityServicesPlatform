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
    async getDashboardData() {
      return {
        currentUser: getStoredSessionUser().userId
          ? getStoredSessionUser()
          : clone(mockState.currentUser),
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
        reportedById: mockState.currentUser.userId,
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
          updatedById: mockState.currentUser.userId,
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
        userId: mockState.currentUser.userId,
        userName: mockState.currentUser.name,
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
        userId: mockState.currentUser.userId,
        score: Number(score),
        feedback: feedback || null,
        ratedAt: new Date().toISOString()
      };

      mockState.ratingsByIssueId[issueId] = rating;
      return clone(rating);
    }
  };

  const apiSource = {
    async getDashboardData() {
      const [issues, categories, regions, notifications] = await Promise.all([
        api.get(api.endpoints.myIssues),
        api.get(api.endpoints.categories),
        api.get(api.endpoints.regions),
        api.get(api.endpoints.myNotifications)
      ]);

      const safeCategories = asArray(categories);
      const safeRegions = asArray(regions);
      const enrichedIssues = asArray(issues).map((issue) => {
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
          statusUpdates: syntheticTimeline(issue),
          rating: null,
          ui: {}
        };
      });

      return {
        currentUser: getStoredSessionUser(),
        notifications: asArray(notifications),
        categories: safeCategories,
        regions: safeRegions,
        issues: enrichedIssues
      };
    },

    async getIssueDetails(issueId) {
      const [issue, comments, attachments, ratings] = await Promise.all([
        api.get(api.endpoints.issueById(issueId)),
        api.get(api.endpoints.commentsByIssue(issueId)),
        api.get(api.endpoints.attachmentsByIssue(issueId)),
        api.get(api.endpoints.ratingsByIssue(issueId))
      ]);

      return {
        ...issue,
        comments: asArray(comments),
        attachments: asArray(attachments),
        statusUpdates: syntheticTimeline(issue),
        rating: asArray(ratings)[0] || null,
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
    getDashboardData: (...args) => getSource().getDashboardData(...args),
    getIssueDetails: (...args) => getSource().getIssueDetails(...args),
    createIssue: (...args) => getSource().createIssue(...args),
    addComment: (...args) => getSource().addComment(...args),
    submitRating: (...args) => getSource().submitRating(...args)
  });

  global.OCSP = ocsp;
})(window);
