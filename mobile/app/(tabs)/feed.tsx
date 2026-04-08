import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, Alert } from "react-native";
import { router } from "expo-router";
import { supabase, type Bone, type Profile } from "../../lib/supabase";

type FeedItem = Bone & { author?: Pick<Profile, "id" | "name" | "photos" | "faculty" | "city"> };

export default function Feed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [me, setMe] = useState<Profile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setMe(p as Profile);
    }
    const { data: bones } = await supabase
      .from("bones")
      .select("*")
      .eq("visibility", "public")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);
    const ids = Array.from(new Set((bones ?? []).map((b: any) => b.user_id)));
    const { data: authors } = ids.length
      ? await supabase.from("profiles").select("id, name, photos, faculty, city").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((authors ?? []).map((a: any) => [a.id, a]));
    setItems(((bones ?? []) as Bone[]).map((b) => ({ ...b, author: map.get(b.user_id) })));
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function respond(boneId: string) {
    const { data, error } = await supabase.rpc("respond_to_public_bone", { p_bone_id: boneId });
    if (error) return Alert.alert("Napaka", error.message);
    router.push(`/matches/${data as string}`);
  }

  return (
    <View className="flex-1 bg-brand-light pt-12">
      <Text className="text-3xl font-bold text-brand-dark px-6 mb-4">Javni boni</Text>
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={<Text className="text-center text-gray-500 mt-10">Trenutno ni javnih bonov</Text>}
        renderItem={({ item }) => {
          const isMine = me && item.user_id === me.id;
          return (
            <View className="bg-white rounded-2xl p-4 shadow">
              <Text className="font-bold text-lg">{item.restaurant}</Text>
              <Text className="text-xs text-gray-500">
                {new Date(item.scheduled_at).toLocaleString("sl-SI")}
              </Text>
              {item.author && (
                <Text className="text-xs text-gray-600 mt-1">
                  {item.author.name} · {item.author.faculty}
                </Text>
              )}
              {item.note && <Text className="text-sm text-gray-700 mt-2">{item.note}</Text>}
              {!isMine && (
                <Pressable onPress={() => respond(item.id)} className="bg-brand rounded-full py-2 items-center mt-3">
                  <Text className="text-white font-semibold">Odgovori</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
