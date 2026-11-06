import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { FlashMessages, PageHeader } from "@/components/ui";
import type { LeaveRequest, LeaveType } from "@/lib/types";
import { updateLeaveRequest } from "../../actions";
import { LeaveForm } from "../../leave-form";

export const metadata = { title: "Edit leave request · Glide5 Portal" };

export default async function EditLeavePage(props: PageProps<"/leave/[id]/edit">) {
  const { id } = await props.params;
  const { supabase, profile } = await requireUser();

  const [requestRes, typesRes] = await Promise.all([
    supabase
      .from("leave_requests")
      .select("id, employee_id, leave_type_id, start_date, end_date, days, reason, status, reviewed_by, reviewed_at, review_note, created_at")
      .eq("id", id)
      .eq("employee_id", profile.id)
      .maybeSingle<LeaveRequest>(),
    supabase.from("leave_types").select("id, name, annual_allowance_days, is_active").eq("is_active", true).order("name"),
  ]);

  const request = requestRes.data;
  if (!request || request.status !== "pending") notFound();

  return (
    <div>
      <PageHeader title="Edit leave request" description="You can change a request until it has been reviewed." />
      <FlashMessages searchParams={props.searchParams} />
      <LeaveForm
        action={updateLeaveRequest.bind(null, request.id)}
        leaveTypes={(typesRes.data ?? []) as LeaveType[]}
        request={request}
        submitLabel="Save changes"
      />
    </div>
  );
}
