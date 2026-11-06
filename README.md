# Glide5 Portal

Hello, World! 👋

Glide5's internal HR portal: company directory, leave requests and approvals, employee records and announcements.

Built with [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind CSS) and [Supabase](https://supabase.com) (Postgres database + authentication).

- Records, roles and access rules: [docs/data-model.md](docs/data-model.md)
- Database changes: [`supabase/migrations`](supabase/migrations) (versioned, applied in order)
- Development sample data: [`supabase/seed.sql`](supabase/seed.sql)
- Permission tests: [`db-tests/access_rules.test.sql`](db-tests/access_rules.test.sql)

## Environments

| Environment | Supabase project | App | Seed data |
|---|---|---|---|
| Local | `npx supabase start` (Docker) or the dev project | `npm run dev` | Yes |
| Development / preview | `glide5portal-dev` | Vercel preview deployments | Yes |
| Production | `glide5portal-prod` | Vercel production | **Never** |

Use separate Supabase projects for development and production. Development keys never go into production settings and vice versa.

## Getting started (local)

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the **development** project's values (Supabase → Project Settings → API Keys).
3. `npm run dev` and open http://localhost:3000

Sign in with any seeded user, password `GlidersDev!2026`:

| Email | Role |
|---|---|
| hira.hr@glide5.test | HR admin |
| omar.manager@glide5.test | Manager (Engineering, manages Ali) |
| zara.manager@glide5.test | Manager (Sales, manages Sara) |
| ali.dev@glide5.test | Employee |
| sara.sales@glide5.test | Employee |

To run Supabase fully on your machine instead (needs Docker): `npx supabase start`, then put the printed API URL and keys in `.env.local`. `npx supabase db reset` rebuilds the local database from the migrations and seed.

## Secrets

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, Vercel | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local`, Vercel | Public; access rules protect data |
| `SUPABASE_SECRET_KEY` | `.env.local`, Vercel (server) | **Secret.** Only imported by `src/lib/supabase/admin.ts`, which fails the build if used in browser code |
| `NEXT_PUBLIC_SITE_URL` | `.env.local`, Vercel | Base URL for email links |
| `SUPABASE_DB_URL` | GitHub environment secrets | **Secret.** Used only by the migration workflow |

`.env*` files are git-ignored (except `.env.example`, which holds placeholders only).

## Database changes (migrations)

1. Create a file: `npx supabase migration new describe_the_change` (or add `supabase/migrations/<timestamp>_<name>.sql` by hand).
2. Write additive SQL where possible (add columns/tables; avoid dropping or renaming in the same release as the code change).
   New functions are not runnable by anyone by default: add `grant execute on function ... to authenticated;` for functions the app or access rules call.
3. Run the tests: `npm run test:db -- --fresh <url-of-an-empty-postgres-database>`.
4. Open a pull request. GitHub Actions applies every migration to a fresh database and runs the permission tests.
5. Merge. GitHub Actions runs `supabase db push` against **development**, then against **production** once a reviewer approves the `production` environment.

`supabase db push` records applied migrations in `supabase_migrations.schema_migrations` and only runs new ones. It never resets the database or loads seed data, so production data is kept. Never run `supabase db reset` against a hosted project.

## Setup checklist (one-time)

**Supabase**

1. Create two projects: `glide5portal-dev` and `glide5portal-prod` (same region).
2. In each: Authentication → Sign In / Providers → turn **off** "Allow new users to sign up" (the portal is invite-only). Email provider stays on.
3. In each: Authentication → URL Configuration → Site URL = that environment's app URL; add `<app-url>/auth/confirm` to Redirect URLs (plus `http://localhost:3000/auth/confirm` on dev and your Vercel preview URL pattern).
4. In each: Authentication → Emails → replace the **Invite user** and **Reset password** templates with `supabase/templates/invite.html` and `recovery.html`.
5. Production: set up custom SMTP (Authentication → Emails → SMTP). Supabase's built-in email sender is rate-limited and meant for testing only.
6. Dev only: run `supabase/seed.sql` once in the SQL editor (after migrations). Then create the first real HR admin in production: invite yourself (Authentication → Users → Invite), then run `update public.profiles set role = 'hr_admin' where email = 'you@glide5.com';` in the production SQL editor.

**GitHub** (Settings → Environments)

1. Create environments `development` and `production`. Add **Required reviewers** to `production`.
2. In each, add secret `SUPABASE_DB_URL` = that project's connection string (Supabase → Connect → Session pooler, with the database password).

**Vercel**

1. Import the GitHub repo.
2. Environment variables: Production → prod project values; Preview and Development → dev project values. Set `NEXT_PUBLIC_SITE_URL` per environment.

## Tests

```bash
# Fresh plain Postgres: loads a stand-in for Supabase Auth, all migrations, seed, then tests
npm run test:db -- --fresh "postgresql://postgres:postgres@localhost:5432/postgres"

# Existing Supabase dev database that already has migrations + seed (changes nothing; rolls back)
npm run test:db -- "<dev database connection string>"
```
