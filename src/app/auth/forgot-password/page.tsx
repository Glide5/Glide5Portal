import Link from "next/link";
import { FlashMessages } from "@/components/ui";
import { sendPasswordReset } from "@/app/login/actions";

// Every page here depends on the signed-in user, so it renders per request.
export const instant = false;

export const metadata = { title: "Reset password · Glide5 Portal" };

export default function ForgotPasswordPage(props: PageProps<"/auth/forgot-password">) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">Reset your password</h1>
        <FlashMessages searchParams={props.searchParams} />
        <form action={sendPasswordReset} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">Work email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <button className="btn btn-primary w-full" type="submit">Send reset link</button>
          <p className="text-center text-sm">
            <Link className="link" href="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
