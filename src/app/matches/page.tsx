import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatScheduledDate } from "@/lib/formatDate";

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

  const { data: matches } = await supabase
    .from("buddy_matches")
    .select("id, created_at, user1_id, user2_id")
    .or(`user1_id.eq.${myProfile.id},user2_id.eq.${myProfile.id}`)
    .order("created_at", { ascending: false });

  const enriched = await Promise.all(
    (matches || []).map(async (match) => {
      const otherId = match.user1_id === myProfile.id ? match.user2_id : match.user1_id;

      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("id, name, photos, faculty, university")
        .eq("id", otherId)
        .single();

      const { data: lastMessage } = await supabase
        .from("chat_messages")
        .select("content, created_at")
        .eq("match_id", match.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Prioritize accepted bone, then open
      const { data: acceptedBone } = await supabase
        .from("meal_invites")
        .select("restaurant, scheduled_at, status")
        .eq("match_id", match.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const activeBone = acceptedBone ?? (await supabase
        .from("meal_invites")
        .select("restaurant, scheduled_at, status")
        .eq("match_id", match.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()).data;

      // Parse invite card JSON for last message preview
      let preview = lastMessage?.content ?? null;
      if (preview) {
        try {
          const parsed = JSON.parse(preview);
          if (parsed?.type === "bone_invite") preview = `Povabilo: ${parsed.restaurant}`;
        } catch {}
      }

      return { match, otherProfile, lastMessage: { content: preview, created_at: lastMessage?.created_at }, activeBone };
    })
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Boni Buddies</h1>
        <p className="text-sm text-white/70 mt-0.5">
          {enriched.length > 0 ? `${enriched.length} ${enriched.length === 1 ? "buddy" : "buddies"}` : "Najdi svojega prvega buddyja!"}
        </p>
      </div>

      {enriched.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-10 flex flex-col items-center gap-3 text-center">
          <div className="text-5xl">💔</div>
          <p className="font-semibold text-gray-800">Še nisi naredil/a nobenih matchev</p>
          <p className="text-sm text-gray-500">Pojdi na Išči in swipaj!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {enriched.map(({ match, otherProfile, lastMessage, activeBone }) => {
            if (!otherProfile) return null;
            const dateStr = lastMessage?.created_at
              ? new Date(lastMessage.created_at).toLocaleDateString("sl-SI", { day: "numeric", month: "numeric" })
              : new Date(match.created_at).toLocaleDateString("sl-SI", { day: "numeric", month: "numeric" });
            return (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <div className={`bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 transition-all hover:shadow-lg hover:scale-[1.01] ${activeBone ? "border-l-4 border-brand" : ""}`}>
                  <Avatar className="w-14 h-14 shrink-0 ring-2 ring-white shadow-md">
                    <AvatarImage src={otherProfile.photos[0]} />
                    <AvatarFallback className="text-lg font-bold bg-brand-light text-brand-dark">
                      {otherProfile.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-base text-gray-900">{otherProfile.name}</span>
                      <span className="text-xs text-gray-400 shrink-0 mt-0.5">{dateStr}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {lastMessage?.content ?? "Pozdravita se! 👋"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="bg-brand-light/80 text-brand-dark text-xs px-2 py-0.5 rounded-full font-medium">
                        {otherProfile.faculty}
                      </span>
                      {activeBone && (
                        <span className="bg-brand text-white text-xs px-2 py-0.5 rounded-full font-medium">
                          🍽️ {activeBone.restaurant}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
