import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileEditor from "@/components/ProfileEditor";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
      <ProfileEditor profile={profile} />
    </div>
  );
}
