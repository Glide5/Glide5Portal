import Link from "next/link";
import { FlashMessages } from "@/components/ui";
import { signIn } from "./actions";

// Every page here depends on the signed-in user, so it renders per request.
export const instant = false;

export const metadata = { title: "Sign in · Glide5 Portal" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">Glide5 Portal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Hello Gliders</h1>
          <p className="mt-2 text-sm text-zinc-500">Sign in with your work email.</p>
        </div>
        <FlashMessages searchParams={props.searchParams} />
        <form action={signIn} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn btn-primary w-full" type="submit">Sign in</button>
          <p className="text-center text-sm">
            <Link className="link" href="/auth/forgot-password">Forgot your password?</Link>
          </p>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-500">New employees receive an invitation email from HR.</p>
      </div>
    </main>
  );
}
