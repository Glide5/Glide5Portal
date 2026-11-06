import Link from "next/link";
import { requireUser, isReviewer } from "@/lib/auth";
import { EmptyState, FlashMessages, formatDate } from "@/components/ui";
import type { Announcement, LeaveBalance } from "@/lib/types";

export default async function HomePage(props: PageProps<"/">) {
  const { supabase, profile } = await requireUser();

  const [balancesRes, announcementsRes, pendingRes] = await Promise.all([
    supabase.rpc("leave_balances", { p_employee: profile.id }),
    supabase.from("announcements").select("id, title, body, published_at").order("published_at", { ascending: false }).limit(3),
    isReviewer(profile.role)
      ? supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending").neq("employee_id", profile.id)
      : Promise.resolve({ count: 0 }),
  ]);

  const balances = (balancesRes.data ?? []) as LeaveBalance[];
  const announcements = (announcementsRes.data ?? []) as Announcement[];
  const pendingApprovals = pendingRes.count ?? 0;
  const firstName = profile.full_name.split(" ")[0] || "there";

  return (
    <div>
      <FlashMessages searchParams={props.searchParams} />
      <h1 className="text-4xl font-semibold tracking-tight">Hello Gliders</h1>
      <p className="mt-2 text-zinc-500">Welcome back, {firstName}.</p>

      {pendingApprovals > 0 && (
        <Link href="/approvals" className="mt-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span>
            <strong>{pendingApprovals}</strong> leave {pendingApprovals === 1 ? "request is" : "requests are"} waiting for your review
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your leave this year</h2>
          <Link href="/leave/new" className="btn btn-primary">Request leave</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {balances.map((b) => (
            <div key={b.leave_type_id} className="card">
              <p className="text-sm text-zinc-500">{b.leave_type}</p>
              <p className="mt-1 text-3xl font-semibold">
                {b.remaining ?? "—"}
                {b.allowance !== null && <span className="text-base font-normal text-zinc-500"> / {b.allowance} days left</span>}
                {b.allowance === null && <span className="text-base font-normal text-zinc-500"> no limit</span>}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {b.approved_days} approved · {b.pending_days} pending
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest announcements</h2>
          <Link href="/announcements" className="link text-sm">See all</Link>
        </div>
        <div className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {announcements.length === 0 && <EmptyState>No announcements yet.</EmptyState>}
          {announcements.map((a) => (
            <article key={a.id} className="px-5 py-4">
              <h3 className="font-medium">{a.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{a.body}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatDate(a.published_at)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
