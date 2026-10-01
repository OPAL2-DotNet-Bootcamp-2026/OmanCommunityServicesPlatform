/** The admin-managed lookups an issue is filed against: regions, departments, categories. */
import { type Governorate } from "./enums";

export interface Region {
  regionId: number;
  regionName: string;
  governorate: Governorate;
}

export interface RegionRequest {
  regionName: string;
  governorate: Governorate;
}

export interface Department {
  departmentId: number;
  departmentName: string;
  description: string | null;
  contactEmail: string;
  regionId: number | null;
  regionName: string | null;
  categoryCount: number;
  issueCount: number;
  userCount: number;
}

export interface DepartmentRequest {
  departmentName: string;
  description: string | null;
  contactEmail: string;
  regionId: number | null;
}

export interface Category {
  categoryId: number;
  categoryName: string;
  description: string | null;
  departmentId: number;
  departmentName: string | null;
  issueCount: number;
}

export interface CategoryRequest {
  categoryName: string;
  description: string | null;
  departmentId: number;
}
