/**
 * Member 4 - convert from scripts/services/dashboard-service.js (170 lines).
 *
 * Start here on day 2: it only needs Member 1's core, so you are not waiting
 * on Member 3's issue-renderers to begin.
 *
 * Same degrade-rather-than-fail shape as DataService - read that file's notes
 * on Promise.allSettled first, they apply here too.
 *
 * The part unique to this service is requireAdmin() at dashboard-service.js:138.
 * The three create* methods throw synchronously before touching the network if
 * the signed-in user is not an Admin. That is a client-side guard for the UI,
 * not a security boundary - the backend enforces it too - but keep it, because
 * the dashboard relies on the throw to show its error banner.
 */
import type { ApiClient } from "../core/api-client";
import type {
  Category,
  CategoryRequest,
  ChangeIssueStatusRequest,
  Comment,
  Department,
  DepartmentRequest,
  Issue,
  IssueDetail,
  Notification,
  Region,
  RegionRequest
} from "../models";
import type { SessionService, SessionUser } from "./session.service";

/** dashboard-service.js:58 */
export interface StaffDashboardData {
  currentUser: SessionUser | null;
  notifications: Notification[];
  categories: Category[];
  regions: Region[];
  departments: Department[];
  issues: Issue[];
  warnings: string[];
}

export class DashboardService {
  constructor(
    protected readonly api: ApiClient,
    protected readonly session: SessionService
  ) {}

  getStaffDashboardData(): Promise<StaffDashboardData> {
    throw new Error("DashboardService.getStaffDashboardData - Member 4, :58");
  }

  getStaffIssueDetails(_issueId: number): Promise<IssueDetail> {
    throw new Error("DashboardService.getStaffIssueDetails - Member 4, :88");
  }

  changeIssueStatus(_issueId: number, _payload: ChangeIssueStatusRequest): Promise<Issue> {
    throw new Error("DashboardService.changeIssueStatus - Member 4, :124");
  }

  addStaffComment(_issueId: number, _content: string): Promise<Comment> {
    throw new Error("DashboardService.addStaffComment - Member 4, :131");
  }

  /** Throws synchronously for non-Admins. dashboard-service.js:144 */
  createRegion(_payload: RegionRequest): Promise<Region> {
    throw new Error("DashboardService.createRegion - Member 4, :144");
  }

  createDepartment(_payload: DepartmentRequest): Promise<Department> {
    throw new Error("DashboardService.createDepartment - Member 4, :149");
  }

  createCategory(_payload: CategoryRequest): Promise<Category> {
    throw new Error("DashboardService.createCategory - Member 4, :154");
  }
}
