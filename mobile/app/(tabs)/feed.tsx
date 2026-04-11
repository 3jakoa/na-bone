import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Bone, type Profile } from "../../lib/supabase";
import { formatScheduledDate } from "../../lib/formatDate";

type FeedItem = Bone & {
  author?: Pick<Profile, "id" | "name" | "photos" | "faculty">;
};

export default function Feed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [me, setMe] = useState<Profile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setMe(p as Profile);
    }
    const { data: bones } = await supabase
      .from("meal_invites")
      .select("*")
      .eq("visibility", "public")
      .eq("status", "open")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(100);

    // Fetch authors
    const ids = Array.from(
      new Set((bones ?? []).map((b: any) => b.user_id))
    );
    const { data: authors } = ids.length
      ? await supabase
          .from("profiles")
          .select("id, name, photos, faculty")
          .in("id", ids)
      : { data: [] as any[] };
    const authorMap = new Map((authors ?? []).map((a: any) => [a.id, a]));

    // Fetch restaurant details as fallback for boni without embedded restaurant_info
    const needLookup = (bones ?? []).filter((b: any) => !b.restaurant_info);
    const lookupNames = Array.from(new Set(needLookup.map((b: any) => b.restaurant as string)));
    let restLookup = new Map<string, any>();
    if (lookupNames.length > 0) {
      const { data: rests } = await supabase
        .from("restaurants")
        .select("name, address, city, supplement_price, meal_price, rating");
      if (rests) {
        restLookup = new Map(rests.map((r: any) => [r.name, r]));
      }
    }

    setItems(
      ((bones ?? []) as Bone[]).map((b) => {
        // Use embedded data, or backfill from restaurants table
        if (!b.restaurant_info && restLookup.has(b.restaurant)) {
          const r = restLookup.get(b.restaurant);
          b = {
            ...b,
            restaurant_info: {
              address: r.address,
              city: r.city,
              rating: r.rating,
              supplement_price: r.supplement_price,
              meal_price: r.meal_price,
            },
          };
        }
        return {
          ...b,
          author: authorMap.get(b.user_id),
        };
      })
    );
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(boneId: string) {
    const { data, error } = await supabase.rpc("respond_to_public_bone", {
      p_bone_id: boneId,
    });
    if (error) return Alert.alert("Napaka", error.message);

    const prefill =
      me?.gender === "ženska"
        ? "Odgovorila sem na tvoje povabilo za boni buddy!"
        : me?.gender === "moški"
          ? "Odgovoril sem na tvoje povabilo za boni buddy!"
          : "Odgovoril/a sem na tvoje povabilo za boni buddy!";

    router.push(
      `/matches/${data as string}?prefill=${encodeURIComponent(prefill)}`
    );
  }

  return (
    <View className="flex-1 bg-gray-50 pt-16">
      <Text className="text-3xl font-bold text-gray-900 px-6 mb-4">
        Javne objave
      </Text>
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListEmptyComponent={
          <View className="items-center mt-16">
            <Ionicons name="restaurant-outline" size={48} color="#ccc" />
            <Text className="text-gray-400 text-lg mt-4">
              Ni javnih objav
            </Text>
            <Text className="text-gray-300 text-sm mt-1">
              Bodi prvi — objavi bon!
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMine = me && item.user_id === me.id;
          const ri = item.restaurant_info;
          return (
            <View className="bg-white rounded-3xl p-5 shadow-sm">
              {/* Author row */}
              {item.author && (
                <Pressable
                  onPress={() =>
                    router.push(`/profile-detail?id=${item.author!.id}`)
                  }
                  className="flex-row items-center mb-3"
                >
                  {item.author.photos?.[0] ? (
                    <Image
                      source={{ uri: item.author.photos[0] }}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                    />
                  ) : (
                    <View className="w-10 h-10 rounded-full bg-brand-light items-center justify-center">
                      <Text className="font-bold text-brand-dark">
                        {item.author.name[0]}
                      </Text>
                    </View>
                  )}
                  <View className="ml-3">
                    <Text className="font-semibold text-gray-900">
                      {item.author.name}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {item.author.faculty}
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* Restaurant info */}
              <View className="mb-2">
                <View className="flex-row items-center">
                  <Ionicons name="restaurant" size={16} color="#00A6F6" />
                  <Text className="font-bold text-base text-gray-900 ml-1.5">
                    {item.restaurant}
                  </Text>
                  {ri?.rating != null && ri.rating > 0 && (
                    <View className="flex-row items-center ml-1.5">
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text className="text-xs font-semibold text-amber-500 ml-0.5">
                        {ri.rating}
                      </Text>
                    </View>
                  )}
                </View>
                {ri && (ri.address || ri.city) && (
                  <Text className="text-xs text-gray-400 ml-6">
                    {[ri.address, ri.city].filter(Boolean).join(", ")}
                  </Text>
                )}
                {ri?.supplement_price != null && (
                  <View className="flex-row items-center ml-6 gap-2">
                    <Text className="text-xs font-semibold text-green-600">
                      {Number(ri.supplement_price).toFixed(2)} EUR doplačilo
                    </Text>
                    {ri.meal_price != null && (
                      <Text className="text-xs text-gray-400">
                        (cena obroka {Number(ri.meal_price).toFixed(2)})
                      </Text>
                    )}
                  </View>
                )}
              </View>

              <View className="bg-blue-50 rounded-xl px-3 py-2 flex-row items-center mb-2 self-start">
                <Ionicons name="calendar" size={16} color="#00A6F6" />
                <Text className="text-sm font-semibold text-brand ml-1.5">
                  {formatScheduledDate(item.scheduled_at)}
                </Text>
              </View>
              {item.note && (
                <Text className="text-sm text-gray-600 mb-3">{item.note}</Text>
              )}

              {!isMine && (
                <Pressable
                  onPress={() => respond(item.id)}
                  className="bg-brand rounded-2xl py-3 items-center"
                >
                  <Text className="text-white font-bold">Pridruži se</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
