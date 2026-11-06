"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { backWithError, backWithNotice, friendlyError, isUuid, text } from "@/lib/forms";

export async function reviewLeaveRequest(id: string, form: FormData) {
  const { supabase } = await requireRole("manager", "hr_admin");
  if (!isUuid(id)) backWithError("/approvals", "Request not found.");

  const decision = form.get("decision");
  if (decision !== "approved" && decision !== "rejected") backWithError("/approvals", "Choose approve or reject.");

  const { data, error } = await supabase
    .from("leave_requests")
    .update({ status: decision, review_note: text(form, "review_note", 1000) })
    .eq("id", id)
    .select("id");
  if (error) backWithError("/approvals", friendlyError(error));
  if (!data?.length) backWithError("/approvals", "You cannot review this request.");

  revalidatePath("/approvals");
  backWithNotice("/approvals", decision === "approved" ? "Leave approved." : "Leave rejected.");
}

// HR only: cancel leave that was already approved (for example, plans changed).
export async function cancelApprovedLeave(id: string, form: FormData) {
  const { supabase } = await requireRole("hr_admin");
  if (!isUuid(id)) backWithError("/approvals", "Request not found.");

  const { data, error } = await supabase
    .from("leave_requests")
    .update({ status: "cancelled", review_note: text(form, "review_note", 1000) })
    .eq("id", id)
    .select("id");
  if (error) backWithError("/approvals", friendlyError(error));
  if (!data?.length) backWithError("/approvals", "You cannot cancel this request.");

  revalidatePath("/approvals");
  backWithNotice("/approvals", "Approved leave cancelled.");
}
