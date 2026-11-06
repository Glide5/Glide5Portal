"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { FormError, backWithError, backWithNotice, friendlyError, handleForm, isUuid, requiredText, text } from "@/lib/forms";

const BACK = "/admin/settings";

function allowance(form: FormData): number | null {
  const raw = text(form, "annual_allowance_days", 4);
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 366) throw new FormError("Allowance must be a whole number of days between 0 and 366, or blank for no limit.");
  return n;
}

export async function addDepartment(form: FormData) {
  await handleForm(BACK, async () => {
    const { supabase } = await requireRole("hr_admin");
    const { error } = await supabase.from("departments").insert({ name: requiredText(form, "name", "Department name", 100) });
    if (error) backWithError(BACK, friendlyError(error));
  });
  revalidatePath(BACK);
  backWithNotice(BACK, "Department added.");
}

export async function renameDepartment(id: string, form: FormData) {
  if (!isUuid(id)) backWithError(BACK, "Department not found.");
  await handleForm(BACK, async () => {
    const { supabase } = await requireRole("hr_admin");
    const { error } = await supabase.from("departments").update({ name: requiredText(form, "name", "Department name", 100) }).eq("id", id);
    if (error) backWithError(BACK, friendlyError(error));
  });
  revalidatePath(BACK);
  backWithNotice(BACK, "Department renamed.");
}

export async function deleteDepartment(id: string) {
  if (!isUuid(id)) backWithError(BACK, "Department not found.");
  const { supabase } = await requireRole("hr_admin");
  // Employees in the department keep their records; their department becomes empty.
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) backWithError(BACK, friendlyError(error));
  revalidatePath(BACK);
  backWithNotice(BACK, "Department deleted.");
}

export async function addLeaveType(form: FormData) {
  await handleForm(BACK, async () => {
    const { supabase } = await requireRole("hr_admin");
    const { error } = await supabase.from("leave_types").insert({
      name: requiredText(form, "name", "Leave type name", 100),
      annual_allowance_days: allowance(form),
    });
    if (error) backWithError(BACK, friendlyError(error));
  });
  revalidatePath(BACK);
  backWithNotice(BACK, "Leave type added.");
}

export async function updateLeaveType(id: string, form: FormData) {
  if (!isUuid(id)) backWithError(BACK, "Leave type not found.");
  await handleForm(BACK, async () => {
    const { supabase } = await requireRole("hr_admin");
    const { error } = await supabase
      .from("leave_types")
      .update({
        name: requiredText(form, "name", "Leave type name", 100),
        annual_allowance_days: allowance(form),
        is_active: form.get("is_active") === "on",
      })
      .eq("id", id);
    if (error) backWithError(BACK, friendlyError(error));
  });
  revalidatePath(BACK);
  backWithNotice(BACK, "Leave type saved.");
}
