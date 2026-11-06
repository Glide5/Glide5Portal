import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";

// The signed-in user's profile, or a redirect to /login.
// Cached per request so layouts and pages share one lookup.
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, job_title, department_id, manager_id, role, status, hire_date")
    .eq("id", userId)
    .single<Profile>();

  if (!profile) redirect("/login?error=" + encodeURIComponent("Your account has no employee profile."));
  if (profile.status === "terminated") {
    await supabase.auth.signOut();
    redirect("/login?error=" + encodeURIComponent("Your account has been deactivated. Please contact HR."));
  }

  return { supabase, profile };
});

// Same as requireUser, but only for the given roles.
export async function requireRole(...roles: AppRole[]) {
  const ctx = await requireUser();
  if (!roles.includes(ctx.profile.role)) redirect("/?error=" + encodeURIComponent("You do not have access to that page."));
  return ctx;
}

export const isReviewer = (role: AppRole) => role === "manager" || role === "hr_admin";
