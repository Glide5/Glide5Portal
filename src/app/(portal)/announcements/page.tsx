import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { EmptyState, Field, FlashMessages, PageHeader, formatDate } from "@/components/ui";
import type { Announcement, Profile } from "@/lib/types";
import { createAnnouncement, deleteAnnouncement, updateAnnouncement } from "./actions";

export const metadata = { title: "Announcements · Glide5 Portal" };

function AnnouncementForm({ action, announcement, submitLabel }: { action: (f: FormData) => Promise<void>; announcement?: Announcement; submitLabel: string }) {
  const prefix = announcement?.id ?? "new";
  return (
    <form action={action} className="space-y-3">
      <Field label="Title" htmlFor={`title-${prefix}`}>
        <input className="input" id={`title-${prefix}`} name="title" required maxLength={200} defaultValue={announcement?.title} />
      </Field>
      <Field label="Message" htmlFor={`body-${prefix}`}>
        <textarea className="input" id={`body-${prefix}`} name="body" rows={4} required maxLength={10000} defaultValue={announcement?.body} />
      </Field>
      <div className="flex gap-2">
        <button className="btn btn-primary" type="submit">{submitLabel}</button>
        {announcement && <Link className="btn" href="/announcements">Cancel</Link>}
      </div>
    </form>
  );
}

export default async function AnnouncementsPage(props: PageProps<"/announcements">) {
  const { supabase, profile } = await requireUser();
  const isHr = profile.role === "hr_admin";
  const { edit } = await props.searchParams;

  const [announcementsRes, peopleRes] = await Promise.all([
    supabase.from("announcements").select("id, title, body, created_by, published_at").order("published_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const announcements = (announcementsRes.data ?? []) as Announcement[];
  const names = new Map(((peopleRes.data ?? []) as Pick<Profile, "id" | "full_name">[]).map((p) => [p.id, p.full_name]));

  return (
    <div>
      <PageHeader title="Announcements" description="News from HR." />
      <FlashMessages searchParams={props.searchParams} />

      {isHr && (
        <div className="card mb-8 max-w-2xl">
          <h2 className="mb-3 text-sm font-semibold">Post an announcement</h2>
          <AnnouncementForm action={createAnnouncement} submitLabel="Post" />
        </div>
      )}

      <div className="max-w-2xl space-y-4">
        {announcements.length === 0 && (
          <div className="card">
            <EmptyState>No announcements yet.</EmptyState>
          </div>
        )}
        {announcements.map((a) =>
          isHr && edit === a.id ? (
            <div key={a.id} className="card">
              <AnnouncementForm action={updateAnnouncement.bind(null, a.id)} announcement={a} submitLabel="Save" />
            </div>
          ) : (
            <article key={a.id} className="card">
              <h2 className="text-lg font-semibold">{a.title}</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {formatDate(a.published_at)}
                {a.created_by && names.get(a.created_by) ? ` · ${names.get(a.created_by)}` : ""}
              </p>
              <p className="mt-3 text-sm whitespace-pre-line text-zinc-700 dark:text-zinc-300">{a.body}</p>
              {isHr && (
                <div className="mt-4 flex gap-2">
                  <Link className="btn" href={`/announcements?edit=${a.id}`}>Edit</Link>
                  <form action={deleteAnnouncement.bind(null, a.id)}>
                    <button className="btn btn-danger" type="submit">Delete</button>
                  </form>
                </div>
              )}
            </article>
          ),
        )}
      </div>
    </div>
  );
}
