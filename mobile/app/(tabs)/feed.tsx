import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
  Image,
  Modal,
  ScrollView,
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
  const [selectedBone, setSelectedBone] = useState<FeedItem | null>(null);

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
            <Pressable
              onPress={() => setSelectedBone(item)}
              className="bg-white rounded-3xl p-5 shadow-sm"
            >
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
                  <View className="ml-3 flex-1">
                    <Text
                      className="font-semibold text-gray-900"
                      numberOfLines={1}
                    >
                      {item.author.name}
                    </Text>
                    <Text className="text-xs text-gray-400" numberOfLines={1}>
                      {item.author.faculty}
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* Restaurant info */}
              <View className="mb-2">
                <View className="flex-row items-start">
                  <Ionicons
                    name="restaurant"
                    size={16}
                    color="#00A6F6"
                    style={{ marginTop: 3 }}
                  />
                  <Text
                    className="flex-1 font-bold text-base text-gray-900 ml-1.5"
                    numberOfLines={2}
                  >
                    {item.restaurant}
                  </Text>
                  {ri?.rating != null && ri.rating > 0 && (
                    <View
                      className="flex-row items-center ml-2 shrink-0"
                      style={{ marginTop: 3 }}
                    >
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text className="text-xs font-semibold text-amber-500 ml-0.5">
                        {ri.rating}
                      </Text>
                    </View>
                  )}
                </View>
                {ri && (ri.address || ri.city) && (
                  <Text
                    className="text-xs text-gray-400 ml-6"
                    numberOfLines={1}
                  >
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
              {item.note ? (
                <Text
                  className="text-sm text-gray-600 mb-3"
                  numberOfLines={2}
                >
                  {item.note}
                </Text>
              ) : null}

              {!isMine && (
                <Pressable
                  onPress={() => respond(item.id)}
                  className="bg-brand rounded-2xl py-3 items-center"
                >
                  <Text className="text-white font-bold">Pridruži se</Text>
                </Pressable>
              )}
            </Pressable>
          );
        }}
      />

      {/* Detail popup */}
      <Modal
        visible={!!selectedBone}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBone(null)}
      >
        <Pressable
          onPress={() => setSelectedBone(null)}
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-3xl w-full max-w-md"
            style={{ maxHeight: "85%" }}
          >
            {selectedBone && (() => {
              const b = selectedBone;
              const ri = b.restaurant_info;
              const isMine = me && b.user_id === me.id;
              return (
                <>
                  <View className="flex-row items-center justify-between px-5 pt-5 pb-2">
                    <Text className="text-lg font-bold text-gray-900">
                      Javni bon
                    </Text>
                    <Pressable
                      onPress={() => setSelectedBone(null)}
                      hitSlop={10}
                    >
                      <Ionicons name="close" size={26} color="#333" />
                    </Pressable>
                  </View>

                  <ScrollView
                    contentContainerStyle={{ padding: 20, paddingTop: 4 }}
                  >
                    {b.author && (
                      <View className="flex-row items-center mb-4">
                        {b.author.photos?.[0] ? (
                          <Image
                            source={{ uri: b.author.photos[0] }}
                            style={{ width: 48, height: 48, borderRadius: 24 }}
                          />
                        ) : (
                          <View className="w-12 h-12 rounded-full bg-brand-light items-center justify-center">
                            <Text className="font-bold text-brand-dark">
                              {b.author.name[0]}
                            </Text>
                          </View>
                        )}
                        <View className="ml-3 flex-1">
                          <Text className="font-semibold text-gray-900">
                            {b.author.name}
                          </Text>
                          <Text className="text-xs text-gray-400">
                            {b.author.faculty}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View className="flex-row items-start mb-2">
                      <Ionicons
                        name="restaurant"
                        size={18}
                        color="#00A6F6"
                        style={{ marginTop: 3 }}
                      />
                      <Text className="flex-1 font-bold text-lg text-gray-900 ml-2">
                        {b.restaurant}
                      </Text>
                      {ri?.rating != null && ri.rating > 0 && (
                        <View
                          className="flex-row items-center ml-2 shrink-0"
                          style={{ marginTop: 5 }}
                        >
                          <Ionicons name="star" size={13} color="#F59E0B" />
                          <Text className="text-xs font-semibold text-amber-500 ml-0.5">
                            {ri.rating}
                          </Text>
                        </View>
                      )}
                    </View>
                    {ri && (ri.address || ri.city) && (
                      <Text className="text-xs text-gray-500 ml-7 mb-1">
                        {[ri.address, ri.city].filter(Boolean).join(", ")}
                      </Text>
                    )}
                    {ri?.supplement_price != null && (
                      <View className="flex-row items-center ml-7 gap-2 mb-3">
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

                    <View className="bg-blue-50 rounded-xl px-3 py-2 flex-row items-center mt-2 mb-3 self-start">
                      <Ionicons name="calendar" size={16} color="#00A6F6" />
                      <Text className="text-sm font-semibold text-brand ml-1.5">
                        {formatScheduledDate(b.scheduled_at)}
                      </Text>
                    </View>

                    {b.note ? (
                      <View className="bg-gray-50 rounded-2xl p-4 mb-4">
                        <Text className="text-sm text-gray-700 leading-5">
                          {b.note}
                        </Text>
                      </View>
                    ) : null}

                    {!isMine && (
                      <Pressable
                        onPress={() => {
                          const id = b.id;
                          setSelectedBone(null);
                          respond(id);
                        }}
                        className="bg-brand rounded-2xl py-4 items-center"
                      >
                        <Text className="text-white font-bold text-base">
                          Pridruži se
                        </Text>
                      </Pressable>
                    )}
                  </ScrollView>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
