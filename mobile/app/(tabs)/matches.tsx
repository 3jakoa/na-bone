import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, Image } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Profile } from "../../lib/supabase";

type Item = { matchId: string; other: Profile; lastMessage?: string };

export default function Matches() {
  const [items, setItems] = useState<Item[]>([]);

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
            .select("content")
            .eq("match_id", m.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (other) {
            let preview = msg?.content;
            if (preview) {
              try {
                const parsed = JSON.parse(preview);
                if (parsed?.type === "bone_invite")
                  preview = `Povabilo: ${parsed.restaurant}`;
              } catch {}
            }
            out.push({
              matchId: m.id,
              other: other as Profile,
              lastMessage: preview,
            });
          }
        }
        setItems(out);
      })();
    }, [])
  );

  return (
    <View className="flex-1 bg-gray-50 pt-16">
      <Text className="text-3xl font-bold text-gray-900 px-6 mb-4">
        Buddies
      </Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.matchId}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        ListEmptyComponent={
          <View className="items-center mt-16">
            <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
            <Text className="text-gray-400 text-lg mt-4">Še ni matchev</Text>
            <Text className="text-gray-300 text-sm mt-1">
              Swipaj da najdeš buddyje
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/matches/${item.matchId}`)}
            className="bg-white rounded-3xl p-4 flex-row items-center gap-3 shadow-sm"
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
                  <Text className="font-bold text-brand-dark">
                    {item.other.name[0]}
                  </Text>
                </View>
              )}
            </Pressable>
            <View className="flex-1">
              <Text className="font-bold text-gray-900">
                {item.other.name}
              </Text>
              <Text className="text-xs text-gray-400" numberOfLines={1}>
                {item.lastMessage ?? "Pozdravita se 👋"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </Pressable>
        )}
      />
    </View>
  );
}
