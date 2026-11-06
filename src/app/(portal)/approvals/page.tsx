import { requireRole } from "@/lib/auth";
import { EmptyState, FlashMessages, PageHeader, StatusBadge, dateRange, formatDate } from "@/components/ui";
import type { LeaveRequest, LeaveType, Profile } from "@/lib/types";
import { cancelApprovedLeave, reviewLeaveRequest } from "./actions";

export const metadata = { title: "Approvals · Glide5 Portal" };

const COLUMNS = "id, employee_id, leave_type_id, start_date, end_date, days, reason, status, reviewed_by, reviewed_at, review_note, created_at";

export default async function ApprovalsPage(props: PageProps<"/approvals">) {
  const { supabase, profile } = await requireRole("manager", "hr_admin");
  const isHr = profile.role === "hr_admin";

  // Access rules already limit managers to their direct reports.
  const [pendingRes, decidedRes, typesRes, peopleRes] = await Promise.all([
    supabase.from("leave_requests").select(COLUMNS).eq("status", "pending").neq("employee_id", profile.id).order("start_date"),
    supabase
      .from("leave_requests")
      .select(COLUMNS)
      .in("status", ["approved", "rejected", "cancelled"])
      .neq("employee_id", profile.id)
      .order("reviewed_at", { ascending: false, nullsFirst: false })
      .limit(25),
    supabase.from("leave_types").select("id, name, annual_allowance_days, is_active"),
    supabase.from("profiles").select("id, full_name, email"),
  ]);

  const pending = (pendingRes.data ?? []) as LeaveRequest[];
  const decided = (decidedRes.data ?? []) as LeaveRequest[];
  const typeName = new Map(((typesRes.data ?? []) as LeaveType[]).map((t) => [t.id, t.name]));
  const people = new Map(((peopleRes.data ?? []) as Pick<Profile, "id" | "full_name" | "email">[]).map((p) => [p.id, p.full_name || p.email]));

  return (
    <div>
      <PageHeader
        title="Approvals"
        description={isHr ? "Leave requests from everyone in the company." : "Leave requests from people who report to you."}
      />
      <FlashMessages searchParams={props.searchParams} />

      <h2 className="mb-3 text-lg font-semibold">Waiting for review ({pending.length})</h2>
      <div className="space-y-3">
        {pending.length === 0 && (
          <div className="card">
            <EmptyState>Nothing to review right now.</EmptyState>
          </div>
        )}
        {pending.map((r) => (
          <div key={r.id} className="card flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium">{people.get(r.employee_id) ?? "Unknown"}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {typeName.get(r.leave_type_id)} · {dateRange(r.start_date, r.end_date)} · {r.days} {r.days === 1 ? "day" : "days"}
              </p>
              {r.reason && <p className="mt-1 text-sm">{r.reason}</p>}
              <p className="mt-1 text-xs text-zinc-500">Requested {formatDate(r.created_at)}</p>
            </div>
            <form action={reviewLeaveRequest.bind(null, r.id)} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <label className="sr-only" htmlFor={`note-${r.id}`}>Note</label>
              <input className="input sm:w-56" id={`note-${r.id}`} name="review_note" placeholder="Note (optional)" maxLength={1000} />
              <button className="btn btn-primary" name="decision" value="approved" type="submit">Approve</button>
              <button className="btn btn-danger" name="decision" value="rejected" type="submit">Reject</button>
            </form>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Recently decided</h2>
      <div className="card overflow-x-auto p-0">
        {decided.length === 0 ? (
          <EmptyState>No decisions yet.</EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Dates</th>
                <th>Type</th>
                <th>Status</th>
                <th>Reviewed by</th>
                {isHr && <th className="sr-only">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {decided.map((r) => (
                <tr key={r.id}>
                  <td>{people.get(r.employee_id)}</td>
                  <td className="whitespace-nowrap">{dateRange(r.start_date, r.end_date)}</td>
                  <td>{typeName.get(r.leave_type_id)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-zinc-600 dark:text-zinc-400">
                    {r.reviewed_by ? people.get(r.reviewed_by) : "—"}
                    {r.review_note && <div className="text-xs italic">{r.review_note}</div>}
                  </td>
                  {isHr && (
                    <td className="text-right">
                      {r.status === "approved" && (
                        <form action={cancelApprovedLeave.bind(null, r.id)}>
                          <button className="btn btn-danger" type="submit">Cancel leave</button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
