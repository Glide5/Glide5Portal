import { requireUser } from "@/lib/auth";
import { Field, FlashMessages, PageHeader, formatDate } from "@/components/ui";
import { EmployeeDetailsFields } from "@/components/employee-details-fields";
import { ROLE_LABELS, type Department, type EmployeeDetails, type Profile } from "@/lib/types";
import { updateMyProfile } from "./actions";

export const metadata = { title: "My profile · Glide5 Portal" };

export default async function ProfilePage(props: PageProps<"/profile">) {
  const { supabase, profile } = await requireUser();

  const [detailsRes, deptRes, managerRes] = await Promise.all([
    supabase
      .from("employee_details")
      .select("profile_id, phone, address, date_of_birth, emergency_contact_name, emergency_contact_phone")
      .eq("profile_id", profile.id)
      .maybeSingle<EmployeeDetails>(),
    profile.department_id
      ? supabase.from("departments").select("id, name").eq("id", profile.department_id).maybeSingle<Department>()
      : Promise.resolve({ data: null }),
    profile.manager_id
      ? supabase.from("profiles").select("full_name, email").eq("id", profile.manager_id).maybeSingle<Pick<Profile, "full_name" | "email">>()
      : Promise.resolve({ data: null }),
  ]);

  const facts: [string, string][] = [
    ["Email", profile.email],
    ["Job title", profile.job_title ?? "—"],
    ["Department", deptRes.data?.name ?? "—"],
    ["Manager", managerRes.data ? managerRes.data.full_name || managerRes.data.email : "—"],
    ["Role", ROLE_LABELS[profile.role]],
    ["Start date", formatDate(profile.hire_date)],
  ];

  return (
    <div>
      <PageHeader title="My profile" description="Keep your details up to date." />
      <FlashMessages searchParams={props.searchParams} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card h-fit">
          <h2 className="mb-3 text-sm font-semibold">Employment</h2>
          <dl className="space-y-2 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-zinc-500">Ask HR to change these.</p>
        </div>
        <form action={updateMyProfile} className="card space-y-6 lg:col-span-2">
          <Field label="Full name" htmlFor="full_name">
            <input className="input" id="full_name" name="full_name" required maxLength={200} defaultValue={profile.full_name} />
          </Field>
          <EmployeeDetailsFields details={detailsRes.data} />
          <button className="btn btn-primary" type="submit">Save</button>
        </form>
      </div>
    </div>
  );
}
