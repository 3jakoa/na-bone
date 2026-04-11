import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, Image } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Profile } from "../../lib/supabase";

const DAYS = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

type LastMessage = {
  preview: string;
  time: string;
  mine: boolean;
  isInvite: boolean;
};

type Item = {
  matchId: string;
  other: Profile;
  last?: LastMessage;
  streak: number;
};

function formatListTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round(
    (today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  }
  if (diffDays === 1) return "Včeraj";
  if (diffDays < 7) return DAYS[date.getDay()];
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

export default function Matches() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: me } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (!me) return;

        const { data: matches } = await supabase
          .from("buddy_matches")
          .select("id, user1_id, user2_id, created_at")
          .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
          .order("created_at", { ascending: false });

        const out: Item[] = [];
        for (const m of matches ?? []) {
          const otherId = m.user1_id === me.id ? m.user2_id : m.user1_id;
          const { data: other } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", otherId)
            .single();
          const { data: msg } = await supabase
            .from("chat_messages")
            .select("content, sender_id, created_at")
            .eq("match_id", m.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!other) continue;

          let last: LastMessage | undefined;
          if (msg) {
            let preview = msg.content ?? "";
            let isInvite = false;
            try {
              const parsed = JSON.parse(preview);
              if (parsed?.type === "bone_invite") {
                preview = parsed.restaurant ?? "Povabilo";
                isInvite = true;
              }
            } catch {}
            last = {
              preview,
              time: formatListTime(msg.created_at),
              mine: msg.sender_id === me.id,
              isInvite,
            };
          }

          // Consecutive-meal streak (RPC, returns 0 if no completed meals yet)
          const { data: streakData } = await supabase.rpc("buddy_streak", {
            p_match_id: m.id,
          });
          const streak = typeof streakData === "number" ? streakData : 0;

          out.push({
            matchId: m.id,
            other: other as Profile,
            last,
            streak,
          });
        }
        setItems(out);
        setLoaded(true);
      })();
    }, [])
  );

  return (
    <View className="flex-1 bg-gray-50 pt-16">
      <View className="px-6 mb-4">
        <Text className="text-3xl font-bold text-gray-900">Buddies</Text>
        {loaded && items.length > 0 && (
          <Text className="text-sm text-gray-400 mt-0.5">
            {items.length} {items.length === 1 ? "pogovor" : "pogovorov"}
          </Text>
        )}
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.matchId}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        ListEmptyComponent={
          loaded ? (
            <View className="items-center mt-16">
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text className="text-gray-400 text-lg mt-4">Še ni matchev</Text>
              <Text className="text-gray-300 text-sm mt-1">
                Swipaj da najdeš buddyje
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/matches/${item.matchId}`)}
            className="bg-white rounded-3xl px-4 py-3.5 flex-row items-center shadow-sm active:bg-gray-50"
          >
            <Pressable
              onPress={() =>
                router.push(`/profile-detail?id=${item.other.id}`)
              }
            >
              {item.other.photos[0] ? (
                <Image
                  source={{ uri: item.other.photos[0] }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              ) : (
                <View className="w-14 h-14 rounded-full bg-brand-light items-center justify-center">
                  <Text className="font-bold text-lg text-brand-dark">
                    {item.other.name[0]}
                  </Text>
                </View>
              )}
            </Pressable>

            <View className="flex-1 ml-3 min-w-0">
              <View className="flex-row items-center">
                <Text
                  className="flex-1 font-bold text-base text-gray-900"
                  numberOfLines={1}
                >
                  {item.other.name}
                </Text>
                {item.streak > 0 && (
                  <View
                    className="flex-row items-center bg-orange-50 rounded-full px-2 py-0.5 ml-2 shrink-0"
                    style={{ gap: 2 }}
                  >
                    <Ionicons name="flame" size={11} color="#F97316" />
                    <Text className="text-xs font-bold text-orange-500">
                      {item.streak}
                    </Text>
                  </View>
                )}
                {item.last && (
                  <Text className="text-xs text-gray-400 ml-2 shrink-0">
                    {item.last.time}
                  </Text>
                )}
              </View>

              <View className="flex-row items-center mt-0.5">
                {item.last?.isInvite && (
                  <Ionicons
                    name="restaurant"
                    size={13}
                    color="#00A6F6"
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  className={`flex-1 text-sm ${
                    item.last?.isInvite
                      ? "text-brand font-semibold"
                      : "text-gray-500"
                  }`}
                  numberOfLines={1}
                >
                  {item.last
                    ? `${item.last.mine ? "Ti: " : ""}${
                        item.last.isInvite
                          ? `Povabilo — ${item.last.preview}`
                          : item.last.preview
                      }`
                    : "Pozdravita se 👋"}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
