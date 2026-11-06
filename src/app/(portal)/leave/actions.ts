"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { backWithError, backWithNotice, date, friendlyError, handleForm, isUuid, text, uuid } from "@/lib/forms";

export async function createLeaveRequest(form: FormData) {
  const back = "/leave/new";
  await handleForm(back, async () => {
    const { supabase, profile } = await requireUser();
    const leaveTypeId = uuid(form, "leave_type_id", "Leave type", true);
    const startDate = date(form, "start_date", "Start date", true);
    const endDate = date(form, "end_date", "End date", true);
    const reason = text(form, "reason", 1000);

    const { error } = await supabase.from("leave_requests").insert({
      employee_id: profile.id,
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      reason,
    });
    if (error) backWithError(back, friendlyError(error));
  });
  revalidatePath("/leave");
  backWithNotice("/leave", "Leave request sent for approval.");
}

export async function updateLeaveRequest(id: string, form: FormData) {
  if (!isUuid(id)) backWithError("/leave", "Request not found.");
  const back = `/leave/${id}/edit`;
  await handleForm(back, async () => {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        leave_type_id: uuid(form, "leave_type_id", "Leave type", true),
        start_date: date(form, "start_date", "Start date", true),
        end_date: date(form, "end_date", "End date", true),
        reason: text(form, "reason", 1000),
      })
      .eq("id", id)
      .select("id");
    if (error) backWithError(back, friendlyError(error));
    if (!data?.length) backWithError(back, "You cannot edit this request.");
  });
  revalidatePath("/leave");
  backWithNotice("/leave", "Leave request updated.");
}

export async function cancelLeaveRequest(id: string) {
  if (!isUuid(id)) backWithError("/leave", "Request not found.");
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("leave_requests").update({ status: "cancelled" }).eq("id", id).select("id");
  if (error) backWithError("/leave", friendlyError(error));
  if (!data?.length) backWithError("/leave", "You cannot cancel this request.");
  revalidatePath("/leave");
  backWithNotice("/leave", "Leave request cancelled.");
}
