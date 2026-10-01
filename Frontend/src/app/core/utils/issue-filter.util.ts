/** Search, filter and sort for the citizen and staff issue lists. */
import { type Issue } from "../models/issue.model";
import { normalizedSearch } from "./text-coercion.util";

export interface IssueFilters {
  search: string;
  status: string;
  priority: string;
  department: string;
  category: string;
  /** "newest" (default) or "oldest". */
  sort: string;
}

export function emptyIssueFilters(): IssueFilters {
  return { search: "", status: "", priority: "", department: "", category: "", sort: "newest" };
}

/** A filtered, sorted copy; staff searches also match issue and reporter ids. */
export function filterIssues(issues: Issue[], filters: IssueFilters, includeIdentifiers = false): Issue[] {
  const search = normalizedSearch(filters.search);
  const visible = issues.filter((issue) => {
    const fields: (string | number | null)[] = [
      issue.title, issue.description, issue.location, issue.categoryName,
      issue.assignedDepartmentName, issue.regionName
    ];
    if (includeIdentifiers) fields.push(issue.issueId, issue.reportedById);
    return (
      (!search || normalizedSearch(fields.join(" ")).includes(search)) &&
      (!filters.status || issue.currentStatus === filters.status) &&
      (!filters.priority || issue.priority === filters.priority) &&
      (!filters.department || issue.assignedDepartmentName === filters.department) &&
      (!filters.category || issue.categoryName === filters.category)
    );
  });
  const direction = filters.sort === "oldest" ? 1 : -1;
  return visible.sort((left, right) => {
    const leftTime = new Date(left.reportedDate).getTime() || 0;
    const rightTime = new Date(right.reportedDate).getTime() || 0;
    return (leftTime - rightTime) * direction;
  });
}
