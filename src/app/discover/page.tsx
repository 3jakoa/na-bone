import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SwipeDeck from "@/components/SwipeDeck";

export default async function DiscoverPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!myProfile) redirect("/onboarding");
  if (!myProfile.is_onboarded) redirect("/onboarding");

  // Get IDs already swiped on (reset daily)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: swipedRows } = await supabase
    .from("profile_swipes")
    .select("swiped_id")
    .eq("swiper_id", myProfile.id)
    .gt("created_at", oneDayAgo);

  // Get blocked users (bidirectional)
  const { data: blockedRows } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", myProfile.id);
  const { data: blockedByRows } = await supabase
    .from("blocked_users")
    .select("blocker_id")
    .eq("blocked_id", myProfile.id);

  const swipedIds = (swipedRows || []).map((s) => s.swiped_id);
  const blockedIds = (blockedRows || []).map((b: any) => b.blocked_id);
  const blockedByIds = (blockedByRows || []).map((b: any) => b.blocker_id);
  const excludeIds = [myProfile.id, ...swipedIds, ...blockedIds, ...blockedByIds];

  const { data: candidates } = await supabase
    .from("profiles")
    .select("*")
    .eq("city", myProfile.city)
    .not("id", "in", `(${excludeIds.join(",")})`)
    .eq("is_onboarded", true)
    .limit(20);

  return (
    <div className="min-h-screen bg-background">
      <SwipeDeck profiles={candidates || []} myProfile={myProfile} />
    </div>
  );
}
