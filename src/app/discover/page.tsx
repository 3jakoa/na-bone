import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SwipeDeck from "@/components/SwipeDeck";

export default async function DiscoverPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Get current user's profile
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!myProfile) redirect("/onboarding");
  if (!myProfile.is_onboarded) redirect("/onboarding");

  // Get IDs already swiped on
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: swipedRows } = await supabase
    .from("swipes")
    .select("swiped_id")
    .eq("swiper_id", myProfile.id)
    .gt("created_at", oneWeekAgo);

  const swipedIds = (swipedRows || []).map((s) => s.swiped_id);
  const excludeIds = [myProfile.id, ...swipedIds];

  // Fetch profiles in same city, not already swiped
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
