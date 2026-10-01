import { type Issue } from "../models/issue.model";
import { emptyIssueFilters, filterIssues } from "./issue-filter.util";

function issue(overrides: Partial<Issue>): Issue {
  return {
    issueId: 1, title: "Pothole", description: "", location: "Bawshar", latitude: null, longitude: null,
    priority: "Medium", currentStatus: "Open", reportedDate: "2026-09-01T08:00:00", reportedById: 3, isUrgent: false,
    categoryName: "Roads", regionName: "Bawshar", assignedDepartmentName: "Roads & Infrastructure",
    categoryId: null, regionId: null, governorate: "", attachments: [], comments: [], statusUpdates: [], rating: null, ui: {},
    ...overrides
  };
}

const issues = [
  issue({ issueId: 1, title: "Pothole on Sultan Qaboos Street", reportedDate: "2026-09-01T08:00:00" }),
  issue({ issueId: 2, title: "Water leak", currentStatus: "Resolved", priority: "High", reportedDate: "2026-09-03T08:00:00" }),
  issue({ issueId: 3, title: "Streetlight out", currentStatus: "InProgress", reportedDate: "2026-09-02T08:00:00" })
];

describe("filterIssues", () => {
  it("shows newest first by default", () => {
    expect(filterIssues(issues, emptyIssueFilters()).map((item) => item.issueId)).toEqual([2, 3, 1]);
  });

  it("can sort oldest first", () => {
    expect(filterIssues(issues, { ...emptyIssueFilters(), sort: "oldest" }).map((item) => item.issueId)).toEqual([1, 3, 2]);
  });

  it("searches case-insensitively", () => {
    expect(filterIssues(issues, { ...emptyIssueFilters(), search: "WATER" }).map((item) => item.issueId)).toEqual([2]);
  });

  it("combines status and priority filters", () => {
    expect(filterIssues(issues, { ...emptyIssueFilters(), status: "Resolved", priority: "High" })).toHaveLength(1);
    expect(filterIssues(issues, { ...emptyIssueFilters(), status: "Resolved", priority: "Low" })).toHaveLength(0);
  });

  it("matches issue ids only when staff search asks for it", () => {
    expect(filterIssues(issues, { ...emptyIssueFilters(), search: "3" })).toHaveLength(0);
    expect(filterIssues(issues, { ...emptyIssueFilters(), search: "3" }, true).map((item) => item.issueId)).toContain(3);
  });

  it("does not change the list it was given", () => {
    const before = issues.map((item) => item.issueId);
    filterIssues(issues, { ...emptyIssueFilters(), sort: "oldest" });
    expect(issues.map((item) => item.issueId)).toEqual(before);
  });
});
