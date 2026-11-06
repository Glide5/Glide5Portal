import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing page for links in Supabase emails (invitations and password resets).
// Supports both link styles:
//   ?token_hash=...&type=invite|recovery   (email templates in supabase/templates)
//   ?code=...                              (default PKCE redirect)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/auth/set-password";
  // Only allow redirects within this site.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) {
    const msg = encodeURIComponent("That link is invalid or has expired. Ask HR for a new invitation or request a new reset link.");
    return NextResponse.redirect(`${origin}/login?error=${msg}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
