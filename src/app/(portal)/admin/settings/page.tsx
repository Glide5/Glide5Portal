import { requireRole } from "@/lib/auth";
import { FlashMessages, PageHeader } from "@/components/ui";
import type { Department, LeaveType } from "@/lib/types";
import { addDepartment, addLeaveType, deleteDepartment, renameDepartment, updateLeaveType } from "./actions";

export const metadata = { title: "Settings · Glide5 Portal" };

export default async function SettingsPage(props: PageProps<"/admin/settings">) {
  const { supabase } = await requireRole("hr_admin");
  const [deptRes, typesRes] = await Promise.all([
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("leave_types").select("id, name, annual_allowance_days, is_active").order("name"),
  ]);
  const departments = (deptRes.data ?? []) as Department[];
  const leaveTypes = (typesRes.data ?? []) as LeaveType[];

  return (
    <div>
      <PageHeader title="Settings" description="Departments and leave types." />
      <FlashMessages searchParams={props.searchParams} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Departments</h2>
          <ul className="space-y-2">
            {departments.map((d) => (
              <li key={d.id} className="flex gap-2">
                <form action={renameDepartment.bind(null, d.id)} className="flex flex-1 gap-2">
                  <label className="sr-only" htmlFor={`dept-${d.id}`}>Department name</label>
                  <input className="input" id={`dept-${d.id}`} name="name" defaultValue={d.name} required maxLength={100} />
                  <button className="btn" type="submit">Rename</button>
                </form>
                <form action={deleteDepartment.bind(null, d.id)}>
                  <button className="btn btn-danger" type="submit">Delete</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addDepartment} className="flex gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <label className="sr-only" htmlFor="new-dept">New department</label>
            <input className="input" id="new-dept" name="name" placeholder="New department" required maxLength={100} />
            <button className="btn btn-primary" type="submit">Add</button>
          </form>
        </section>

        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Leave types</h2>
            <p className="text-sm text-zinc-500">Allowance is working days per calendar year. Leave blank for no limit.</p>
          </div>
          <ul className="space-y-2">
            {leaveTypes.map((t) => (
              <li key={t.id}>
                <form action={updateLeaveType.bind(null, t.id)} className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`lt-name-${t.id}`}>Name</label>
                  <input className="input flex-1" id={`lt-name-${t.id}`} name="name" defaultValue={t.name} required maxLength={100} />
                  <label className="sr-only" htmlFor={`lt-days-${t.id}`}>Days per year</label>
                  <input className="input w-24" id={`lt-days-${t.id}`} name="annual_allowance_days" type="number" min={0} max={366} placeholder="No limit" defaultValue={t.annual_allowance_days ?? ""} />
                  <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={t.is_active} /> In use
                  </label>
                  <button className="btn" type="submit">Save</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addLeaveType} className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <label className="sr-only" htmlFor="new-lt">New leave type</label>
            <input className="input flex-1" id="new-lt" name="name" placeholder="New leave type" required maxLength={100} />
            <label className="sr-only" htmlFor="new-lt-days">Days per year</label>
            <input className="input w-24" id="new-lt-days" name="annual_allowance_days" type="number" min={0} max={366} placeholder="Days" />
            <button className="btn btn-primary" type="submit">Add</button>
          </form>
        </section>
      </div>
    </div>
  );
}
