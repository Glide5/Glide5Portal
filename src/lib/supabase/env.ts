// Public values: safe to expose to the browser. Access rules in the database
// (row level security) decide what each signed-in user can read or change.
export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. See .env.example.");
  return value;
}

export function supabasePublishableKey(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See .env.example.");
  return value;
}
