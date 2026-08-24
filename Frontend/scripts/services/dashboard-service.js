(function initializeOcspDashboardService(global) {
  "use strict";

  const ocsp = global.OCSP || {};
  const config = ocsp.config || {};
  const api = ocsp.apiClient;
  const session = ocsp.sessionService;

  // Shared normalization keeps mock and API responses identical for the page controller.
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

  function actor() {
    const user = session && session.getUser();
    if (!user || !["Staff", "Admin"].includes(user.role)) {
      throw new Error("A Staff or Admin session is required for the dashboard.");
    }
    return user;
  }

  function requiredText(value, label, maximumLength) {
    const text = String(value || "").trim();
    if (!text) {
      throw new Error(`${label} is required.`);
    }
    if (text.length > maximumLength) {
      throw new Error(`${label} must be ${maximumLength} characters or fewer.`);
    }
    return text;
  }

  function optionalText(value, label, maximumLength) {
    const text = String(value || "").trim();
    if (text.length > maximumLength) {
      throw new Error(`${label} must be ${maximumLength} characters or fewer.`);
    }
    return text || null;
  }

  function positiveId(value, label) {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) {
      throw new Error(`Select a valid ${label}.`);
    }
    return id;
  }

  function sameName(left, right) {
    return String(left || "").trim().toLocaleLowerCase()
      === String(right || "").trim().toLocaleLowerCase();
  }

  const governorates = new Set([
    "Muscat",
    "Dhofar",
    "Musandam",
    "AlBuraimi",
    "AdDakhiliyah",
    "AlBatinahNorth",
    "AlBatinahSouth",
    "AshSharqiyahNorth",
    "AshSharqiyahSouth",
    "AdhDhahirah",
    "AlWusta"
  ]);

  // Mock state is page-local and deliberately mirrors backend DTOs.
  const mockState = clone(ocsp.mockData || {});

  function buildMockDepartments() {
    const byId = new Map();
    asArray(mockState.categories).forEach((category) => {
      const departmentId = Number(category.departmentId);
      if (!Number.isInteger(departmentId) || !category.departmentName || byId.has(departmentId)) {
        return;
      }

      const relatedIssue = asArray(mockState.issues).find(
        (issue) => issue.assignedDepartmentName === category.departmentName
      );
      const region = asArray(mockState.regions).find(
        (item) => item.regionName === (relatedIssue && relatedIssue.regionName)
      ) || asArray(mockState.regions)[0] || null;

      byId.set(departmentId, {
        departmentId,
        departmentName: category.departmentName,
        description: category.description || null,
        contactEmail: `department${departmentId}@ocsp.om`,
        regionId: region ? region.regionId : null,
        regionName: region ? region.regionName : null,
        categoryCount: 0,
        issueCount: 0,
        userCount: 0
      });
    });

    const departments = [...byId.values()];
    departments.forEach((department) => {
      department.categoryCount = asArray(mockState.categories).filter(
        (category) => Number(category.departmentId) === department.departmentId
      ).length;
      department.issueCount = asArray(mockState.issues).filter(
        (issue) => issue.assignedDepartmentName === department.departmentName
      ).length;
    });
    return departments;
  }

  mockState.departments = asArray(mockState.departments).length
    ? mockState.departments
    : buildMockDepartments();

  function categoryForIssue(issue) {
    return asArray(mockState.categories).find(
      (category) => category.categoryName === issue.categoryName
    ) || null;
  }

  function regionForIssue(issue) {
    return asArray(mockState.regions).find(
      (region) => region.regionName === issue.regionName
    ) || null;
  }

  function composeMockIssue(issue, includeDetails) {
    const category = categoryForIssue(issue);
    const region = regionForIssue(issue);
    const rating = clone((mockState.ratingsByIssueId || {})[issue.issueId] || null);
    const composed = {
      ...clone(issue),
      categoryId: category ? category.categoryId : null,
      regionId: region ? region.regionId : null
    };

    if (!includeDetails) {
      return composed;
    }

    return {
      ...composed,
      attachments: clone((mockState.attachmentsByIssueId || {})[issue.issueId] || []),
      comments: clone((mockState.commentsByIssueId || {})[issue.issueId] || []),
      statusUpdates: clone((mockState.statusUpdatesByIssueId || {})[issue.issueId] || [])
        .sort((left, right) => new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()),
      ratings: rating ? [clone(rating)] : [],
      rating,
      warnings: []
    };
  }

  function findMockIssue(issueId) {
    const issue = asArray(mockState.issues).find(
      (item) => Number(item.issueId) === Number(issueId)
    );
    if (!issue) {
      throw new Error("The selected issue could not be found.");
    }
    return issue;
  }

  function allMockStatusUpdates() {
    return Object.values(mockState.statusUpdatesByIssueId || {})
      .flat()
      .map(clone)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }

  // The UI intentionally exposes forward workflow steps even though the DTO
  // accepts any valid status enum value.
  function assertForwardTransition(currentStatus, nextStatus) {
    const allowed = {
      Open: ["InProgress", "Resolved"],
      InProgress: ["Resolved"],
      Resolved: []
    };
    if (!allowed[currentStatus] || !allowed[currentStatus].includes(nextStatus)) {
      throw new Error("Select a valid next status for this issue.");
    }
  }

  const mockSource = {
    async getStaffDashboardData() {
      const currentActor = actor();
      return {
        currentUser: clone(currentActor),
        notifications: clone(asArray(mockState.notifications).filter(
          (notification) => Number(notification.userId) === Number(currentActor.userId)
        )),
        issues: asArray(mockState.issues).map((issue) => composeMockIssue(issue, false)),
        categories: clone(asArray(mockState.categories)),
        regions: clone(asArray(mockState.regions)),
        departments: clone(asArray(mockState.departments)),
        statusUpdates: allMockStatusUpdates(),
        warnings: []
      };
    },

    async getStaffIssueDetails(issueId) {
      return composeMockIssue(findMockIssue(issueId), true);
    },

    async changeIssueStatus(issueId, payload) {
      const issue = findMockIssue(issueId);
      const nextStatus = String(payload && payload.newStatus || "");
      const notes = optionalText(payload && payload.notes, "Status notes", 500);
      assertForwardTransition(issue.currentStatus, nextStatus);

      const allUpdates = allMockStatusUpdates();
      const update = {
        statusUpdateId: nextId(allUpdates, "statusUpdateId", 1),
        issueId: Number(issue.issueId),
        updatedById: Number(actor().userId),
        previousStatus: issue.currentStatus,
        newStatus: nextStatus,
        notes,
        updatedAt: new Date().toISOString()
      };

      issue.currentStatus = nextStatus;
      issue.ui = {
        ...(issue.ui || {}),
        hasFreshUpdate: true,
        updateTitle: `Status changed to ${nextStatus === "InProgress" ? "In Progress" : nextStatus}`,
        updateMessage: notes || "Municipal staff updated this issue."
      };
      mockState.statusUpdatesByIssueId[issue.issueId] = [
        ...asArray((mockState.statusUpdatesByIssueId || {})[issue.issueId]),
        update
      ];
      return clone(update);
    },

    async addStaffComment(issueId, content) {
      findMockIssue(issueId);
      const message = requiredText(content, "Comment", 1000);
      const commentsByIssue = mockState.commentsByIssueId || (mockState.commentsByIssueId = {});
      const comments = asArray(commentsByIssue[issueId]);
      const comment = {
        commentId: nextId(Object.values(commentsByIssue).flat(), "commentId", 1),
        issueId: Number(issueId),
        userId: Number(actor().userId),
        userName: actor().name,
        content: message,
        isStaffComment: true,
        commentDate: new Date().toISOString()
      };
      comments.push(comment);
      commentsByIssue[issueId] = comments;
      return clone(comment);
    },

    async createRegion(payload) {
      const regionName = requiredText(payload && payload.regionName, "Region name", 100);
      const governorate = String(payload && payload.governorate || "");
      if (!governorates.has(governorate)) {
        throw new Error("Select a valid governorate.");
      }
      if (asArray(mockState.regions).some((region) => sameName(region.regionName, regionName))) {
        throw new Error("A region with this name already exists.");
      }

      const region = {
        regionId: nextId(mockState.regions, "regionId", 1),
        regionName,
        governorate
      };
      mockState.regions.push(region);
      return clone(region);
    },

    async createDepartment(payload) {
      const departmentName = requiredText(payload && payload.departmentName, "Department name", 100);
      const contactEmail = requiredText(payload && payload.contactEmail, "Contact email", 150);
      const description = optionalText(payload && payload.description, "Department description", 500);
      const rawRegionId = payload && payload.regionId;
      const regionId = rawRegionId === null || rawRegionId === undefined || rawRegionId === ""
        ? null
        : positiveId(rawRegionId, "region");
      const region = regionId === null
        ? null
        : asArray(mockState.regions).find((item) => Number(item.regionId) === regionId);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        throw new Error("Enter a valid contact email.");
      }
      if (regionId !== null && !region) {
        throw new Error("Select a valid region.");
      }
      if (asArray(mockState.departments).some(
        (department) => sameName(department.departmentName, departmentName)
      )) {
        throw new Error("A department with this name already exists.");
      }

      const department = {
        departmentId: nextId(mockState.departments, "departmentId", 1),
        departmentName,
        description,
        contactEmail,
        regionId,
        regionName: region ? region.regionName : null,
        categoryCount: 0,
        issueCount: 0,
        userCount: 0
      };
      mockState.departments.push(department);
      return clone(department);
    },

    async createCategory(payload) {
      const categoryName = requiredText(payload && payload.categoryName, "Category name", 100);
      const description = optionalText(payload && payload.description, "Category description", 300);
      const departmentId = positiveId(payload && payload.departmentId, "department");
      const department = asArray(mockState.departments).find(
        (item) => Number(item.departmentId) === departmentId
      );

      if (!department) {
        throw new Error("Select a valid department.");
      }
      if (asArray(mockState.categories).some(
        (category) => sameName(category.categoryName, categoryName)
      )) {
        throw new Error("A category with this name already exists.");
      }

      const category = {
        categoryId: nextId(mockState.categories, "categoryId", 1),
        categoryName,
        description,
        departmentId,
        departmentName: department.departmentName,
        issueCount: 0
      };
      mockState.categories.push(category);
      department.categoryCount = Number(department.categoryCount || 0) + 1;
      return clone(category);
    }
  };

  function settledValue(result, fallback) {
    return result.status === "fulfilled" ? result.value : fallback;
  }

  // Secondary requests may fail independently; keep the main screen usable
  // while telling the controller which sections could not be loaded.
  function rejectedSections(results, labels) {
    return results
      .map((result, index) => result.status === "rejected" ? labels[index] : null)
      .filter(Boolean);
  }

  function normalizeApiIssue(issue) {
    return {
      ...issue,
      ui: {
        imageUrl: "",
        imageAlt: "",
        imageStyle: "document",
        previewLabel: "Issue attachment",
        mapAreaName: issue.regionName || "Issue location",
        mapVariant: "city",
        hasFreshUpdate: false
      }
    };
  }

  function normalizeApiAttachment(attachment) {
    return {
      ...attachment,
      fileUrl: api.resolveApiAssetUrl(attachment.fileUrl),
      label: `Attachment ${attachment.attachmentId || ""}`.trim(),
      style: attachment.fileType === "Image" ? "document" : "document"
    };
  }

  const apiSource = {
    async getStaffDashboardData() {
      const results = await Promise.allSettled([
        api.get(api.endpoints.allIssues),
        api.get(api.endpoints.categories),
        api.get(api.endpoints.regions),
        api.get(api.endpoints.departments),
        api.get(api.endpoints.myNotifications),
        api.get(api.endpoints.allStatusUpdates)
      ]);

      if (results[0].status === "rejected") {
        throw results[0].reason;
      }

      return {
        currentUser: clone(actor()),
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
    },

    async getStaffIssueDetails(issueId) {
      const results = await Promise.allSettled([
        api.get(api.endpoints.issueById(issueId)),
        api.get(api.endpoints.commentsByIssue(issueId)),
        api.get(api.endpoints.attachmentsByIssue(issueId)),
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
      ) || ratings[0] || null;

      return {
        ...issue,
        comments: asArray(settledValue(results[1], [])),
        attachments: asArray(settledValue(results[2], [])).map(normalizeApiAttachment),
        statusUpdates: asArray(settledValue(results[3], []))
          .sort((left, right) => new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()),
        ratings,
        rating: reporterRating,
        warnings: rejectedSections(
          results.slice(1),
          ["comments", "attachments", "activity timeline", "ratings"]
        )
      };
    },

    async changeIssueStatus(issueId, payload) {
      return api.put(api.endpoints.changeIssueStatus(issueId), payload);
    },

    async addStaffComment(issueId, content) {
      return api.post(api.endpoints.createComment, {
        issueId: Number(issueId),
        content
      });
    },

    async createRegion(payload) {
      return api.post(api.endpoints.createRegion, payload);
    },

    async createDepartment(payload) {
      return api.post(api.endpoints.createDepartment, payload);
    },

    async createCategory(payload) {
      return api.post(api.endpoints.createCategory, payload);
    }
  };

  const selectedSource = config.dataSource === "api" ? apiSource : mockSource;

  async function runAdminMutation(method, args) {
    if (actor().role !== "Admin") {
      throw new Error("Only an Admin can change platform setup.");
    }
    return selectedSource[method](...args);
  }

  ocsp.dashboardService = Object.freeze({
    getStaffDashboardData: (...args) => selectedSource.getStaffDashboardData(...args),
    getStaffIssueDetails: (...args) => selectedSource.getStaffIssueDetails(...args),
    changeIssueStatus: (...args) => selectedSource.changeIssueStatus(...args),
    addStaffComment: (...args) => selectedSource.addStaffComment(...args),
    createRegion: (...args) => runAdminMutation("createRegion", args),
    createDepartment: (...args) => runAdminMutation("createDepartment", args),
    createCategory: (...args) => runAdminMutation("createCategory", args)
  });

  global.OCSP = ocsp;
})(window);
