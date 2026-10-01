/**
 * Users, sign-in and registration (DTOs/UserDTOs.cs).
 *
 * Translation rules used in every model file: C# "string?"/"int?" become
 * "| null" (the API sends the key with null), and DateTime becomes an ISO string.
 */
import { type UserRole } from "./enums";

export interface User {
  userId: number;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  regionId: number | null;
  departmentId: number | null;
  registrationDate: string;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** The backend spells the token with a capital T; the session accepts either. */
export interface LoginResponse {
  Token?: string;
  token?: string;
  userId: number;
  name: string;
  role: UserRole;
  email?: string;
  phoneNumber?: string | null;
  regionId?: number | null;
  departmentId?: number | null;
  departmentName?: string | null;
  isActive?: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber: string | null;
  regionId: number | null;
}
