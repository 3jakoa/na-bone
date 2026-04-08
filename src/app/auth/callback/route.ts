import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { STUDENT_EMAIL_DOMAINS } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  // Enforce student-domain restriction (also for OAuth)
  const email = (user.email ?? "").toLowerCase();
  const allowed = STUDENT_EMAIL_DOMAINS.some((d) => email.endsWith(`@${d}`));
  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/login?error=not_student`);
  }

  // Route based on onboarding status. Profile row may not exist yet for OAuth users.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_onboarded")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_onboarded) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }
  return NextResponse.redirect(`${origin}/discover`);
}
