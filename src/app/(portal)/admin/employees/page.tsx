import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Field, FlashMessages, PageHeader } from "@/components/ui";
import { EmployeeFields } from "@/components/employee-fields";
import { ROLE_LABELS, STATUS_LABELS, type Department, type Profile } from "@/lib/types";
import { inviteEmployee } from "./actions";

export const metadata = { title: "Employees · Glide5 Portal" };

export default async function EmployeesPage(props: PageProps<"/admin/employees">) {
  const { supabase } = await requireRole("hr_admin");

  const [peopleRes, deptRes] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, job_title, department_id, manager_id, role, status, hire_date").order("full_name"),
    supabase.from("departments").select("id, name").order("name"),
  ]);
  const people = (peopleRes.data ?? []) as Profile[];
  const departments = (deptRes.data ?? []) as Department[];
  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const managers = people.filter((p) => p.status !== "terminated" && p.role !== "employee");

  return (
    <div>
      <PageHeader title="Employees" description="Manage employee records and invite new people." />
      <FlashMessages searchParams={props.searchParams} />

      <div className="card mb-8 overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Job title</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th className="sr-only">Actions</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className={p.status === "terminated" ? "opacity-60" : ""}>
                <td>
                  <div className="font-medium">{p.full_name || "—"}</div>
                  <div className="text-xs text-zinc-500">{p.email}</div>
                </td>
                <td>{p.job_title ?? "—"}</td>
                <td>{p.department_id ? deptName.get(p.department_id) : "—"}</td>
                <td>{ROLE_LABELS[p.role]}</td>
                <td>{STATUS_LABELS[p.status]}</td>
                <td className="text-right">
                  <Link href={`/admin/employees/${p.id}`} className="btn">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={inviteEmployee} className="card max-w-3xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Invite an employee</h2>
          <p className="text-sm text-zinc-500">They will get an email with a link to choose a password.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="full_name">
            <input className="input" id="full_name" name="full_name" required maxLength={200} />
          </Field>
          <Field label="Work email" htmlFor="email">
            <input className="input" id="email" name="email" type="email" required maxLength={320} />
          </Field>
        </div>
        <EmployeeFields departments={departments} managers={managers} />
        <button className="btn btn-primary" type="submit">Send invitation</button>
      </form>
    </div>
  );
}
