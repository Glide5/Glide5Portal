"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { backWithError, backWithNotice, friendlyError, handleForm, isUuid, requiredText } from "@/lib/forms";

export async function createAnnouncement(form: FormData) {
  await handleForm("/announcements", async () => {
    const { supabase } = await requireRole("hr_admin");
    const { error } = await supabase.from("announcements").insert({
      title: requiredText(form, "title", "Title", 200),
      body: requiredText(form, "body", "Message", 10000),
    });
    if (error) backWithError("/announcements", friendlyError(error));
  });
  revalidatePath("/", "layout");
  backWithNotice("/announcements", "Announcement posted.");
}

export async function updateAnnouncement(id: string, form: FormData) {
  if (!isUuid(id)) backWithError("/announcements", "Announcement not found.");
  const back = `/announcements?edit=${id}`;
  await handleForm(back, async () => {
    const { supabase } = await requireRole("hr_admin");
    const { data, error } = await supabase
      .from("announcements")
      .update({ title: requiredText(form, "title", "Title", 200), body: requiredText(form, "body", "Message", 10000) })
      .eq("id", id)
      .select("id");
    if (error) backWithError(back, friendlyError(error));
    if (!data?.length) backWithError("/announcements", "Announcement not found.");
  });
  revalidatePath("/", "layout");
  backWithNotice("/announcements", "Announcement updated.");
}

export async function deleteAnnouncement(id: string) {
  if (!isUuid(id)) backWithError("/announcements", "Announcement not found.");
  const { supabase } = await requireRole("hr_admin");
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) backWithError("/announcements", friendlyError(error));
  revalidatePath("/", "layout");
  backWithNotice("/announcements", "Announcement deleted.");
}
