import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// Supabase client with the SECRET key. It bypasses all access rules, so:
//  - it is only importable on the server ("server-only" fails the build otherwise),
//  - it is only used for Auth admin tasks (inviting and blocking users),
//  - callers must check the signed-in user is an HR admin first.
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY (server-only). See .env.example.");
  }
  return createClient(supabaseUrl(), secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
