"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { backWithError, backWithNotice, text } from "@/lib/forms";

export async function signIn(form: FormData) {
  const email = text(form, "email", 320);
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  if (!email || !password) backWithError("/login", "Enter your email and password.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Same message for every failure so the form does not reveal which emails exist.
    backWithError("/login", "Incorrect email or password, or your account is not active.");
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function sendPasswordReset(form: FormData) {
  const email = text(form, "email", 320);
  if (!email) backWithError("/auth/forgot-password", "Enter your email address.");

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/auth/set-password`,
  });
  // Always the same answer, whether or not the email exists.
  backWithNotice("/auth/forgot-password", "If that email belongs to an account, a reset link is on its way.");
}
