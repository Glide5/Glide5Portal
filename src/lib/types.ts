// Shapes of the rows the portal reads. These mirror supabase/migrations.
// To generate exact types later: npx supabase gen types typescript --linked

export type AppRole = "employee" | "manager" | "hr_admin";
export type EmploymentStatus = "active" | "on_leave" | "terminated";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Department {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  job_title: string | null;
  department_id: string | null;
  manager_id: string | null;
  role: AppRole;
  status: EmploymentStatus;
  hire_date: string | null;
}

export interface EmployeeDetails {
  profile_id: string;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export interface LeaveType {
  id: string;
  name: string;
  annual_allowance_days: number | null;
  is_active: boolean;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface LeaveBalance {
  leave_type_id: string;
  leave_type: string;
  allowance: number | null;
  approved_days: number;
  pending_days: number;
  remaining: number | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  created_by: string | null;
  published_at: string;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  employee: "Employee",
  manager: "Manager",
  hr_admin: "HR admin",
};

export const STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  on_leave: "On leave",
  terminated: "Terminated",
};
