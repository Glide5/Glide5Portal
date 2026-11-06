import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { isUuid } from "@/lib/forms";
import { EmptyState, Field, FlashMessages, PageHeader, StatusBadge, dateRange } from "@/components/ui";
import { EmployeeFields } from "@/components/employee-fields";
import { EmployeeDetailsFields } from "@/components/employee-details-fields";
import type { Department, EmployeeDetails, LeaveRequest, LeaveType, Profile } from "@/lib/types";
import { updateEmployee } from "../actions";

export const metadata = { title: "Edit employee · Glide5 Portal" };

export default async function EditEmployeePage(props: PageProps<"/admin/employees/[id]">) {
  const { id } = await props.params;
  if (!isUuid(id)) notFound();
  const { supabase } = await requireRole("hr_admin");

  const [employeeRes, detailsRes, deptRes, peopleRes, leaveRes, typesRes] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, job_title, department_id, manager_id, role, status, hire_date").eq("id", id).maybeSingle<Profile>(),
    supabase
      .from("employee_details")
      .select("profile_id, phone, address, date_of_birth, emergency_contact_name, emergency_contact_phone")
      .eq("profile_id", id)
      .maybeSingle<EmployeeDetails>(),
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name, email, role, status").neq("status", "terminated").neq("role", "employee").order("full_name"),
    supabase
      .from("leave_requests")
      .select("id, employee_id, leave_type_id, start_date, end_date, days, reason, status, reviewed_by, reviewed_at, review_note, created_at")
      .eq("employee_id", id)
      .order("start_date", { ascending: false })
      .limit(10),
    supabase.from("leave_types").select("id, name, annual_allowance_days, is_active"),
  ]);

  const employee = employeeRes.data;
  if (!employee) notFound();
  const leave = (leaveRes.data ?? []) as LeaveRequest[];
  const typeName = new Map(((typesRes.data ?? []) as LeaveType[]).map((t) => [t.id, t.name]));

  return (
    <div>
      <PageHeader
        title={employee.full_name || employee.email}
        description={employee.email}
        actions={<Link href="/admin/employees" className="btn">All employees</Link>}
      />
      <FlashMessages searchParams={props.searchParams} />

      <div className="grid gap-6 lg:grid-cols-3">
        <form action={updateEmployee.bind(null, employee.id)} className="card space-y-6 lg:col-span-2">
          <Field label="Full name" htmlFor="full_name">
            <input className="input" id="full_name" name="full_name" required maxLength={200} defaultValue={employee.full_name} />
          </Field>
          <EmployeeFields
            employee={employee}
            departments={(deptRes.data ?? []) as Department[]}
            managers={(peopleRes.data ?? []) as Pick<Profile, "id" | "full_name" | "email">[]}
            showStatus
          />
          <EmployeeDetailsFields details={detailsRes.data} />
          <button className="btn btn-primary" type="submit">Save employee</button>
        </form>

        <div className="card h-fit p-0">
          <h2 className="px-5 pt-4 text-sm font-semibold">Recent leave</h2>
          {leave.length === 0 ? (
            <EmptyState>No leave requests.</EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
              {leave.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 px-5 py-3">
                  <span>
                    {typeName.get(r.leave_type_id)}
                    <span className="block text-xs text-zinc-500">{dateRange(r.start_date, r.end_date)} · {r.days}d</span>
                  </span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
