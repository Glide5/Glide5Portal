import { requireUser } from "@/lib/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import type { Department, Profile } from "@/lib/types";

export const metadata = { title: "Directory · Glide5 Portal" };

export default async function DirectoryPage(props: PageProps<"/directory">) {
  const { supabase } = await requireUser();
  const { q } = await props.searchParams;
  const search = typeof q === "string" ? q.trim().slice(0, 100) : "";

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, job_title, department_id, manager_id, role, status, hire_date")
    .neq("status", "terminated")
    .order("full_name");
  if (search) {
    // Escape characters that have meaning in PostgREST filters.
    const safe = search.replace(/[%,()*\\]/g, " ");
    query = query.or(`full_name.ilike.%${safe}%,job_title.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const [peopleRes, deptRes] = await Promise.all([query, supabase.from("departments").select("id, name")]);
  const people = (peopleRes.data ?? []) as Profile[];
  const deptName = new Map(((deptRes.data ?? []) as Department[]).map((d) => [d.id, d.name]));
  const nameById = new Map(people.map((p) => [p.id, p.full_name || p.email]));

  return (
    <div>
      <PageHeader title="Directory" description="Everyone at Glide5." />
      <form className="mb-4 flex max-w-md gap-2" role="search">
        <label className="sr-only" htmlFor="q">Search</label>
        <input className="input" id="q" name="q" defaultValue={search} placeholder="Search by name, title or email" />
        <button className="btn" type="submit">Search</button>
      </form>
      <div className="card overflow-x-auto p-0">
        {people.length === 0 ? (
          <EmptyState>No one matches that search.</EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Job title</th>
                <th>Department</th>
                <th>Manager</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.full_name || "—"}</td>
                  <td>{p.job_title ?? "—"}</td>
                  <td>{p.department_id ? deptName.get(p.department_id) : "—"}</td>
                  <td>{p.manager_id ? nameById.get(p.manager_id) ?? "—" : "—"}</td>
                  <td><a className="link" href={`mailto:${p.email}`}>{p.email}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
