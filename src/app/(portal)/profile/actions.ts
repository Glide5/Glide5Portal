"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { backWithError, backWithNotice, date, friendlyError, handleForm, requiredText, text } from "@/lib/forms";

export async function updateMyProfile(form: FormData) {
  await handleForm("/profile", async () => {
    const { supabase, profile } = await requireUser();
    const fullName = requiredText(form, "full_name", "Full name", 200);

    const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile.id);
    if (profileError) backWithError("/profile", friendlyError(profileError));

    const { error: detailsError } = await supabase.from("employee_details").upsert({
      profile_id: profile.id,
      phone: text(form, "phone", 50),
      address: text(form, "address", 500),
      date_of_birth: date(form, "date_of_birth", "Date of birth"),
      emergency_contact_name: text(form, "emergency_contact_name", 200),
      emergency_contact_phone: text(form, "emergency_contact_phone", 50),
    });
    if (detailsError) backWithError("/profile", friendlyError(detailsError));
  });
  revalidatePath("/", "layout");
  backWithNotice("/profile", "Your details have been saved.");
}
