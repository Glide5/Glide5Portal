import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { EmptyState, FlashMessages, PageHeader, StatusBadge, dateRange, formatDate } from "@/components/ui";
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/lib/types";
import { cancelLeaveRequest } from "./actions";

export const metadata = { title: "My leave · Glide5 Portal" };

export default async function LeavePage(props: PageProps<"/leave">) {
  const { supabase, profile } = await requireUser();

  const [requestsRes, typesRes, balancesRes] = await Promise.all([
    supabase
      .from("leave_requests")
      .select("id, employee_id, leave_type_id, start_date, end_date, days, reason, status, reviewed_by, reviewed_at, review_note, created_at")
      .eq("employee_id", profile.id)
      .order("start_date", { ascending: false }),
    supabase.from("leave_types").select("id, name, annual_allowance_days, is_active"),
    supabase.rpc("leave_balances", { p_employee: profile.id }),
  ]);

  const requests = (requestsRes.data ?? []) as LeaveRequest[];
  const typeName = new Map(((typesRes.data ?? []) as LeaveType[]).map((t) => [t.id, t.name]));
  const balances = (balancesRes.data ?? []) as LeaveBalance[];

  return (
    <div>
      <PageHeader
        title="My leave"
        description="Request time off and follow your requests."
        actions={<Link href="/leave/new" className="btn btn-primary">Request leave</Link>}
      />
      <FlashMessages searchParams={props.searchParams} />

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        {balances.map((b) => (
          <span key={b.leave_type_id} className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            {b.leave_type}: <strong>{b.remaining ?? "no limit"}</strong>
            {b.allowance !== null && " days left"}
          </span>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        {requests.length === 0 ? (
          <EmptyState>You have not requested any leave yet.</EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Dates</th>
                <th>Type</th>
                <th>Days</th>
                <th>Status</th>
                <th>Note</th>
                <th className="sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{dateRange(r.start_date, r.end_date)}</td>
                  <td>{typeName.get(r.leave_type_id) ?? "—"}</td>
                  <td>{r.days}</td>
                  <td>
                    <StatusBadge status={r.status} />
                    {r.reviewed_at && <div className="mt-1 text-xs text-zinc-500">{formatDate(r.reviewed_at)}</div>}
                  </td>
                  <td className="max-w-xs text-zinc-600 dark:text-zinc-400">
                    {r.reason && <div>{r.reason}</div>}
                    {r.review_note && <div className="mt-1 text-xs italic">Reviewer: {r.review_note}</div>}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Link href={`/leave/${r.id}/edit`} className="btn">Edit</Link>
                        <form action={cancelLeaveRequest.bind(null, r.id)}>
                          <button className="btn btn-danger" type="submit">Cancel</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
