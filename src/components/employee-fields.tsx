import { Field } from "@/components/ui";
import { ROLE_LABELS, STATUS_LABELS, type AppRole, type Department, type EmploymentStatus, type Profile } from "@/lib/types";

// HR-managed employment fields, shared by the invite and edit forms.
export function EmployeeFields({
  employee,
  departments,
  managers,
  showStatus,
}: {
  employee?: Profile;
  departments: Department[];
  managers: Pick<Profile, "id" | "full_name" | "email">[];
  showStatus?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Job title" htmlFor="job_title">
        <input className="input" id="job_title" name="job_title" maxLength={200} defaultValue={employee?.job_title ?? ""} />
      </Field>
      <Field label="Department" htmlFor="department_id">
        <select className="input" id="department_id" name="department_id" defaultValue={employee?.department_id ?? ""}>
          <option value="">None</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Manager" htmlFor="manager_id" hint="Managers review this person's leave.">
        <select className="input" id="manager_id" name="manager_id" defaultValue={employee?.manager_id ?? ""}>
          <option value="">None</option>
          {managers
            .filter((m) => m.id !== employee?.id)
            .map((m) => (
              <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
            ))}
        </select>
      </Field>
      <Field label="Role" htmlFor="role">
        <select className="input" id="role" name="role" defaultValue={employee?.role ?? "employee"}>
          {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </Field>
      <Field label="Start date" htmlFor="hire_date">
        <input className="input" id="hire_date" name="hire_date" type="date" defaultValue={employee?.hire_date ?? ""} />
      </Field>
      {showStatus && (
        <Field label="Status" htmlFor="status" hint="Terminated employees can no longer sign in.">
          <select className="input" id="status" name="status" defaultValue={employee?.status ?? "active"}>
            {(Object.keys(STATUS_LABELS) as EmploymentStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </Field>
      )}
    </div>
  );
}
