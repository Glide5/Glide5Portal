"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";
import { backWithError, backWithNotice, date, friendlyError, handleForm, isUuid, oneOf, requiredText, text, uuid } from "@/lib/forms";

const ROLES = ["employee", "manager", "hr_admin"] as const;
const STATUSES = ["active", "on_leave", "terminated"] as const;

// HR invites a new employee. Supabase emails them a link to set a password.
export async function inviteEmployee(form: FormData) {
  const back = "/admin/employees";
  let invitedEmail = "";
  await handleForm(back, async () => {
    // Check HR access with the user's own session BEFORE using the secret key.
    const { supabase } = await requireRole("hr_admin");

    const email = requiredText(form, "email", "Email", 320).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) backWithError(back, "Enter a valid email address.");
    const fullName = requiredText(form, "full_name", "Full name", 200);
    const role = oneOf(form, "role", ROLES, "Role");
    const departmentId = uuid(form, "department_id", "Department");
    const managerId = uuid(form, "manager_id", "Manager");
    const jobTitle = text(form, "job_title", 200);
    const hireDate = date(form, "hire_date", "Start date");

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${await siteUrl()}/auth/confirm?next=/auth/set-password`,
    });
    if (error || !data.user) {
      const msg = error?.message?.toLowerCase().includes("already") ? "Someone with that email already has an account." : "The invitation could not be sent.";
      if (error) console.error("Invite failed", error);
      backWithError(back, msg);
    }

    // The auth trigger has created the profile; fill in the HR fields as the HR user,
    // so the same database rules apply as for any other edit.
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role, department_id: departmentId, manager_id: managerId, job_title: jobTitle, hire_date: hireDate })
      .eq("id", data.user.id);
    if (updateError) backWithError(back, `Invitation sent, but saving the details failed: ${friendlyError(updateError)}`);
    invitedEmail = email;
  });
  revalidatePath(back);
  backWithNotice(back, `Invitation sent to ${invitedEmail}.`);
}

export async function updateEmployee(id: string, form: FormData) {
  if (!isUuid(id)) backWithError("/admin/employees", "Employee not found.");
  const back = `/admin/employees/${id}`;
  await handleForm(back, async () => {
    const { supabase } = await requireRole("hr_admin");

    const { data: before } = await supabase.from("profiles").select("status").eq("id", id).single<{ status: string }>();
    if (!before) backWithError("/admin/employees", "Employee not found.");

    const status = oneOf(form, "status", STATUSES, "Status");
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: requiredText(form, "full_name", "Full name", 200),
        job_title: text(form, "job_title", 200),
        department_id: uuid(form, "department_id", "Department"),
        manager_id: uuid(form, "manager_id", "Manager"),
        role: oneOf(form, "role", ROLES, "Role"),
        status,
        hire_date: date(form, "hire_date", "Start date"),
      })
      .eq("id", id)
      .select("id");
    if (error) backWithError(back, friendlyError(error));
    if (!data?.length) backWithError(back, "You cannot edit this employee.");

    const { error: detailsError } = await supabase.from("employee_details").upsert({
      profile_id: id,
      phone: text(form, "phone", 50),
      address: text(form, "address", 500),
      date_of_birth: date(form, "date_of_birth", "Date of birth"),
      emergency_contact_name: text(form, "emergency_contact_name", 200),
      emergency_contact_phone: text(form, "emergency_contact_phone", 50),
    });
    if (detailsError) backWithError(back, friendlyError(detailsError));

    // Terminated employees are also blocked from signing in; reactivating unblocks them.
    if ((status === "terminated") !== (before.status === "terminated")) {
      const admin = createAdminClient();
      const { error: banError } = await admin.auth.admin.updateUserById(id, {
        ban_duration: status === "terminated" ? "876000h" : "none",
      });
      if (banError) {
        console.error("Updating sign-in block failed", banError);
        backWithError(back, "Saved, but updating their sign-in access failed. Try saving again.");
      }
    }
  });
  revalidatePath("/admin/employees");
  backWithNotice(back, "Employee saved.");
}
