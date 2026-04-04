import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatView from "@/components/ChatView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MatchChatPage({ params }: Props) {
  const { id: matchId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!myProfile) redirect("/onboarding");

  // Verify this match belongs to current user
  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .or(`user1_id.eq.${myProfile.id},user2_id.eq.${myProfile.id}`)
    .single();

  if (!match) redirect("/matches");

  const otherId = match.user1_id === myProfile.id ? match.user2_id : match.user1_id;

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", otherId)
    .single();

  if (!otherProfile) redirect("/matches");

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  const { data: activeBone } = await supabase
    .from("bones")
    .select("*")
    .eq("match_id", matchId)
    .in("status", ["open", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <ChatView
      matchId={matchId}
      myProfile={myProfile}
      otherProfile={otherProfile}
      initialMessages={messages || []}
      activeBone={activeBone}
    />
  );
}
