import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default async function MatchesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!myProfile) redirect("/onboarding");

  // Get all matches with the other person's profile
  const { data: matches } = await supabase
    .from("matches")
    .select("id, created_at, user1_id, user2_id")
    .or(`user1_id.eq.${myProfile.id},user2_id.eq.${myProfile.id}`)
    .order("created_at", { ascending: false });

  // For each match, get the other person's profile and last message
  const enriched = await Promise.all(
    (matches || []).map(async (match) => {
      const otherId = match.user1_id === myProfile.id ? match.user2_id : match.user1_id;

      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("id, name, photos, faculty, university")
        .eq("id", otherId)
        .single();

      const { data: lastMessage } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("match_id", match.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: activeBone } = await supabase
        .from("bones")
        .select("restaurant, scheduled_at, status")
        .eq("match_id", match.id)
        .eq("status", "open")
        .maybeSingle();

      return { match, otherProfile, lastMessage, activeBone };
    })
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Moji Matchi 🍽️</h1>

      {enriched.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">💔</div>
          <p className="font-medium">Še nisi naredil/a nobenih matchev</p>
          <p className="text-sm mt-1">Pojdi na Iskanje in swipaj!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enriched.map(({ match, otherProfile, lastMessage, activeBone }) => {
            if (!otherProfile) return null;
            return (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                  <Avatar className="w-14 h-14 shrink-0">
                    <AvatarImage src={otherProfile.photos[0]} />
                    <AvatarFallback>{otherProfile.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{otherProfile.name}</span>
                      {activeBone && (
                        <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                          🍽️ {activeBone.restaurant}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {lastMessage?.content ?? "Pozdravita se! 👋"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{otherProfile.faculty}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(lastMessage?.created_at ?? match.created_at).toLocaleDateString("sl-SI")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
