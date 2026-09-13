/**
 * Every backend route in one place, so page scripts never build URLs.
 *
 * Transcribed verbatim from the endpoints object in
 * scripts/services/api-client.js:8. This one is written out for you: it is
 * sixty URL strings with nothing to learn from retyping them, and every other
 * member's code reads properties off it from day one.
 *
 * The casing is the backend's, not ours - /issue/GetMyIssues and
 * /category/GetAllCategories really are spelled that way, while StatusUpdate
 * sits under /api/. Do not tidy it; match Controllers/.
 */
export const endpoints = Object.freeze({
  login: "/user/login",
  register: "/user/register",
  updateProfile: (userId: number) => `/user/${userId}/update-profile`,
  changeUserRole: "/user/change-role",
  assignUserDepartment: "/user/assign-department",
  deactivateUser: (userId: number) => `/user/${userId}/deactivate`,

  myIssues: "/issue/GetMyIssues",
  allIssues: "/issue/GetAllIssues",
  issueById: (issueId: number) => `/issue/GetIssueById/${issueId}`,
  createIssue: "/issue/Create",
  changeIssueStatus: (issueId: number) => `/issue/ChangeIssueStatus/${issueId}`,
  allStatusUpdates: "/api/StatusUpdate",
  statusUpdateById: (statusUpdateId: number) => `/api/StatusUpdate/${statusUpdateId}`,
  statusUpdatesByIssue: (issueId: number) => `/api/StatusUpdate/issue/${issueId}`,
  deleteStatusUpdate: (statusUpdateId: number) => `/api/StatusUpdate/${statusUpdateId}`,

  categories: "/category/GetAllCategories",
  categoryById: (categoryId: number) => `/category/GetCategoryById/${categoryId}`,
  createCategory: "/category/Add",
  updateCategory: (categoryId: number) => `/category/Update/${categoryId}`,
  deleteCategory: (categoryId: number) => `/category/Delete/${categoryId}`,

  regions: "/region/GetAll",
  regionById: (regionId: number) => `/region/GetById/${regionId}`,
  createRegion: "/region/Add",
  updateRegion: (regionId: number) => `/region/Update/${regionId}`,
  deleteRegion: (regionId: number) => `/region/Delete/${regionId}`,

  departments: "/department/GetAllDepartments",
  departmentById: (departmentId: number) => `/department/GetDepartmentById/${departmentId}`,
  createDepartment: "/department/Add",
  updateDepartment: (departmentId: number) => `/department/Update/${departmentId}`,
  deleteDepartment: (departmentId: number) => `/department/Delete/${departmentId}`,

  commentsByIssue: (issueId: number) => `/comment/issue/${issueId}`,
  createComment: "/comment/newComment",
  deleteComment: (commentId: number) => `/comment/${commentId}`,

  attachmentsByIssue: (issueId: number) => `/attachment/Issue/${issueId}`,
  attachmentById: (attachmentId: number) => `/attachment/${attachmentId}`,
  createAttachment: "/attachment/Create",
  updateAttachment: (attachmentId: number) => `/attachment/Update/${attachmentId}`,
  deleteAttachment: (attachmentId: number) => `/attachment/Delete/${attachmentId}`,

  ratings: "/rating/GetAll",
  ratingById: (ratingId: number) => `/rating/GetById/${ratingId}`,
  ratingsByIssue: (issueId: number) => `/rating/GetByIssueId/${issueId}`,
  createRating: "/rating/Create",
  updateRating: (ratingId: number) => `/rating/Update/${ratingId}`,
  deleteRating: (ratingId: number) => `/rating/Delete/${ratingId}`,

  notifications: "/notification",
  notificationById: (notificationId: number) => `/notification/${notificationId}`,
  myNotifications: "/notification/my",
  unreadNotifications: "/notification/my/unread",
  createNotification: (userId: number) => `/notification/user/${userId}`,
  updateNotification: (notificationId: number) => `/notification/${notificationId}`,
  markNotificationRead: (notificationId: number) => `/notification/${notificationId}/read`,
  updateNotificationReadStatus: (notificationId: number) =>
    `/notification/${notificationId}/read-status`,
  deleteNotification: (notificationId: number) => `/notification/${notificationId}`
});

export type ApiEndpoints = typeof endpoints;
