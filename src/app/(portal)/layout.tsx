import Link from "next/link";
import { requireUser, isReviewer } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { ROLE_LABELS } from "@/lib/types";

// Every page here depends on the signed-in user, so it renders per request.
export const instant = false;

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireUser();

  const links = [
    { href: "/", label: "Home" },
    { href: "/leave", label: "My leave" },
    ...(isReviewer(profile.role) ? [{ href: "/approvals", label: "Approvals" }] : []),
    { href: "/directory", label: "Directory" },
    { href: "/announcements", label: "Announcements" },
    ...(profile.role === "hr_admin"
      ? [
          { href: "/admin/employees", label: "Employees" },
          { href: "/admin/settings", label: "Settings" },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            Glide5 <span className="text-indigo-600">Portal</span>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-2.5 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/profile" className="text-right leading-tight hover:underline">
              <span className="block font-medium">{profile.full_name || profile.email}</span>
              <span className="block text-xs text-zinc-500">{ROLE_LABELS[profile.role]}</span>
            </Link>
            <form action={signOut}>
              <button className="btn" type="submit">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
