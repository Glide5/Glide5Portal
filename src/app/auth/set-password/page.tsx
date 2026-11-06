import { redirect } from "next/navigation";
import { FlashMessages } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { backWithError } from "@/lib/forms";

// Every page here depends on the signed-in user, so it renders per request.
export const instant = false;

export const metadata = { title: "Set password · Glide5 Portal" };

async function setPassword(form: FormData) {
  "use server";
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 10) backWithError("/auth/set-password", "Use at least 10 characters.");
  if (password !== confirm) backWithError("/auth/set-password", "The two passwords do not match.");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) backWithError("/auth/set-password", error.message);
  redirect("/?notice=" + encodeURIComponent("Your password has been set."));
}

export default async function SetPasswordPage(props: PageProps<"/auth/set-password">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight">Choose a password</h1>
        <p className="mb-6 text-center text-sm text-zinc-500">You will use it to sign in to Glide5 Portal.</p>
        <FlashMessages searchParams={props.searchParams} />
        <form action={setPassword} className="card space-y-4">
          <div>
            <label className="label" htmlFor="password">New password</label>
            <input className="input" id="password" name="password" type="password" minLength={10} autoComplete="new-password" required />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm password</label>
            <input className="input" id="confirm" name="confirm" type="password" minLength={10} autoComplete="new-password" required />
          </div>
          <button className="btn btn-primary w-full" type="submit">Save password</button>
        </form>
      </div>
    </main>
  );
}
