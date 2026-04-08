import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { supabase, type Profile } from "../../lib/supabase";

type Item = { matchId: string; other: Profile; lastMessage?: string };

export default function Matches() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: me } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (!me) return;

      const { data: matches } = await supabase
        .from("matches")
        .select("id, user1_id, user2_id, created_at")
        .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
        .order("created_at", { ascending: false });

      const out: Item[] = [];
      for (const m of matches ?? []) {
        const otherId = m.user1_id === me.id ? m.user2_id : m.user1_id;
        const { data: other } = await supabase.from("profiles").select("*").eq("id", otherId).single();
        const { data: msg } = await supabase
          .from("messages")
          .select("content")
          .eq("match_id", m.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (other) out.push({ matchId: m.id, other: other as Profile, lastMessage: msg?.content });
      }
      setItems(out);
    })();
  }, []);

  return (
    <View className="flex-1 bg-brand-light pt-12">
      <Text className="text-3xl font-bold text-brand-dark px-6 mb-4">Buddies</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.matchId}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">Še ni matchev</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/matches/${item.matchId}`)} className="bg-white rounded-2xl p-4 flex-row items-center gap-3 shadow">
            {item.other.photos[0] ? (
              <Image source={{ uri: item.other.photos[0] }} className="w-14 h-14 rounded-full" />
            ) : (
              <View className="w-14 h-14 rounded-full bg-brand-light items-center justify-center">
                <Text className="font-bold text-brand-dark">{item.other.name[0]}</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="font-bold">{item.other.name}</Text>
              <Text className="text-xs text-gray-500" numberOfLines={1}>
                {item.lastMessage ?? "Pozdravita se 👋"}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
