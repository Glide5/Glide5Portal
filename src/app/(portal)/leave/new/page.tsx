import { requireUser } from "@/lib/auth";
import { FlashMessages, PageHeader } from "@/components/ui";
import type { LeaveType } from "@/lib/types";
import { createLeaveRequest } from "../actions";
import { LeaveForm } from "../leave-form";

export const metadata = { title: "Request leave · Glide5 Portal" };

export default async function NewLeavePage(props: PageProps<"/leave/new">) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("leave_types").select("id, name, annual_allowance_days, is_active").eq("is_active", true).order("name");

  return (
    <div>
      <PageHeader title="Request leave" description="Your manager will review the request." />
      <FlashMessages searchParams={props.searchParams} />
      <LeaveForm action={createLeaveRequest} leaveTypes={(data ?? []) as LeaveType[]} submitLabel="Send request" />
    </div>
  );
}
