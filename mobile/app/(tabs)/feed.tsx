import { useCallback, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Bone, type Profile } from "../../lib/supabase";
import { formatScheduledDate } from "../../lib/formatDate";

type FeedItem = Bone & {
  author?: Pick<Profile, "id" | "name" | "photos" | "faculty">;
};

function inviteDisplayKey(item: Pick<Bone, "user_id" | "restaurant" | "scheduled_at">) {
  return [
    item.user_id,
    item.restaurant.trim().toLowerCase(),
    item.scheduled_at,
  ].join("::");
}

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
    let myProfile: Profile | null = null;
    if (user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      myProfile = (p as Profile) ?? null;
    }
    setMe(myProfile);

    let bones: any[] | null = null;
    let bonesError: { message: string } | null = null;

    if (myProfile?.id) {
      const { data: matches, error: matchesError } = await supabase
        .from("buddy_matches")
        .select("id")
        .or(`user1_id.eq.${myProfile.id},user2_id.eq.${myProfile.id}`);

      if (matchesError) {
        setItems([]);
        setRefreshing(false);
        Alert.alert("Napaka", matchesError.message);
        return;
      }

      const matchIds = (matches ?? []).map((match: any) => match.id);
      const visibilityFilters = [
        "visibility.eq.public",
        `user_id.eq.${myProfile.id}`,
      ];
      if (matchIds.length > 0) {
        visibilityFilters.push(`match_id.in.(${matchIds.join(",")})`);
      }

      const result = await supabase
        .from("meal_invites")
        .select("*")
        .eq("status", "open")
        .is("source_public_invite_id", null)
        .gte("scheduled_at", new Date().toISOString())
        .or(visibilityFilters.join(","))
        .order("scheduled_at", { ascending: true })
        .limit(100);
      bones = result.data;
      bonesError = result.error;
    } else {
      const result = await supabase
          .from("meal_invites")
          .select("*")
          .eq("status", "open")
          .eq("visibility", "public")
          .is("source_public_invite_id", null)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(100);
      bones = result.data;
      bonesError = result.error;
    }

    if (bonesError) {
      setItems([]);
      setRefreshing(false);
      Alert.alert("Napaka", bonesError.message);
      return;
    }

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

    const mapped = ((bones ?? []) as Bone[]).map((b) => {
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
    });

    const seenOwnPrivateGroups = new Set<string>();
    const publicInviteKeys = new Set(
      mapped
        .filter((item) => item.visibility === "public")
        .map((item) => inviteDisplayKey(item))
    );
    const visibleItems: FeedItem[] = [];
    for (const item of mapped) {
      if (item.source_public_invite_id) continue;

      // If the same author already has an active public bon for this slot,
      // show buddies only the public card, not a duplicate private one.
      if (
        item.visibility === "private" &&
        publicInviteKeys.has(inviteDisplayKey(item))
      ) {
        continue;
      }

      const shouldGroupOwnPrivate =
        myProfile?.id === item.user_id &&
        item.visibility === "private" &&
        !!item.invite_group_id;
      if (shouldGroupOwnPrivate) {
        if (seenOwnPrivateGroups.has(item.invite_group_id!)) continue;
        seenOwnPrivateGroups.add(item.invite_group_id!);
      }
      visibleItems.push(item);
    }

    setItems(visibleItems);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openPrivateInvite(item: FeedItem) {
    if (!item.match_id) {
      return Alert.alert("Napaka", "Povabilo nima pogovora.");
    }
    setSelectedBone(null);
    router.push(`/matches/${item.match_id}`);
  }

  async function respond(item: FeedItem) {
    if (item.visibility === "private") {
      openPrivateInvite(item);
      return;
    }

    const { data, error } = await supabase.rpc("respond_to_public_bone", {
      p_bone_id: item.id,
    });
    if (error) return Alert.alert("Napaka", error.message);

    setSelectedBone(null);
    router.push(`/matches/${data as string}`);
  }

  function confirmCancelBone(item: FeedItem) {
    Alert.alert(
      "Umakni bon?",
      "Bon ne bo več prikazan drugim uporabnikom.",
      [
        { text: "Nazaj", style: "cancel" },
        {
          text: "Umakni",
          style: "destructive",
          onPress: () => cancelBone(item),
        },
      ]
    );
  }

  async function cancelBone(item: FeedItem) {
    if (!me) return;

    const previousItems = items;
    const previousSelected = selectedBone;
    setItems((current) =>
      current.filter((currentItem) =>
        item.invite_group_id
          ? currentItem.invite_group_id !== item.invite_group_id
          : currentItem.id !== item.id
      )
    );
    if (
      selectedBone?.id === item.id ||
      (item.invite_group_id &&
        selectedBone?.invite_group_id === item.invite_group_id)
    ) {
      setSelectedBone(null);
    }

    let query = supabase
      .from("meal_invites")
      .update({ status: "expired" })
      .eq("user_id", me.id)
      .eq("status", "open")
      .select("id");

    if (item.invite_group_id) {
      query = query.eq("invite_group_id", item.invite_group_id);
    } else if (item.visibility === "public") {
      query = query.or(`id.eq.${item.id},source_public_invite_id.eq.${item.id}`);
    } else {
      query = query.eq("id", item.id);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      setItems(previousItems);
      setSelectedBone(previousSelected);
      Alert.alert(
        "Napaka",
        error?.message ?? "Tega bona trenutno ni mogoče umakniti."
      );
    }
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950 pt-16">
      <Text className="text-3xl font-bold text-gray-900 dark:text-white px-6 mb-4">
        Aktivni boni
      </Text>
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListEmptyComponent={
          <View className="items-center mt-16 bg-white dark:bg-neutral-900 rounded-3xl px-6 py-8 shadow-sm">
            <View className="w-16 h-16 rounded-full bg-brand/10 items-center justify-center">
              <Ionicons name="restaurant-outline" size={30} color="#00A6F6" />
            </View>
            <Text className="text-gray-900 dark:text-white text-xl font-bold mt-5">
              Ni aktivnih bonov
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2 text-center">
              Bodi prvi in objavi nov bon za kosilo.
            </Text>
            <Pressable
              onPress={() => router.navigate("/(tabs)/create")}
              className="mt-6 bg-brand rounded-2xl px-6 py-3 min-w-[160px] items-center"
            >
              <Text className="text-white font-bold text-base">Nov bon</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const isMine = me && item.user_id === me.id;
          const isPrivate = item.visibility === "private";
          const ri = item.restaurant_info;
          return (
            <Pressable
              onPress={() => {
                if (!isMine) {
                  respond(item);
                  return;
                }
                setSelectedBone(item);
              }}
              className="bg-white dark:bg-neutral-900 rounded-3xl p-5 shadow-sm"
            >
              {isMine && (
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    confirmCancelBone(item);
                  }}
                  className="absolute top-4 right-4 z-10 rounded-full bg-red-50 dark:bg-red-500/10 px-3 py-1.5"
                >
                  <Text className="text-xs font-semibold text-red-500 dark:text-red-300">
                    Umakni bon
                  </Text>
                </Pressable>
              )}

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
                    <View className="w-10 h-10 rounded-full bg-brand-light dark:bg-neutral-800 items-center justify-center">
                      <Text className="font-bold text-brand-dark dark:text-brand">
                        {item.author.name[0]}
                      </Text>
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <Text
                      className="font-semibold text-gray-900 dark:text-white"
                      numberOfLines={1}
                    >
                      {item.author.name}
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-gray-500" numberOfLines={1}>
                      {item.author.faculty}
                    </Text>
                  </View>
                </Pressable>
              )}

              <View className="flex-row flex-wrap gap-2 mb-3">
                {isMine && (
                  <View className="rounded-full bg-brand/10 px-3 py-1">
                    <Text className="text-xs font-semibold text-brand">
                      Tvoj bon
                    </Text>
                  </View>
                )}
                <View
                  className={`rounded-full px-3 py-1 ${
                    isPrivate
                      ? "bg-gray-100 dark:bg-neutral-800"
                      : "bg-blue-50 dark:bg-brand/20"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isPrivate
                        ? "text-gray-500 dark:text-gray-300"
                        : "text-brand"
                    }`}
                  >
                    {isPrivate ? "Zasebno" : "Javno"}
                  </Text>
                </View>
              </View>

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
                    className="flex-1 font-bold text-base text-gray-900 dark:text-white ml-1.5"
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
                    className="text-xs text-gray-400 dark:text-gray-500 ml-6"
                    numberOfLines={1}
                  >
                    {[ri.address, ri.city].filter(Boolean).join(", ")}
                  </Text>
                )}
                {ri?.supplement_price != null && (
                  <View className="flex-row items-center ml-6 gap-2">
                    <Text className="text-xs font-semibold text-green-600 dark:text-green-400">
                      {Number(ri.supplement_price).toFixed(2)} EUR doplačilo
                    </Text>
                    {ri.meal_price != null && (
                      <Text className="text-xs text-gray-400 dark:text-gray-500">
                        (cena obroka {Number(ri.meal_price).toFixed(2)})
                      </Text>
                    )}
                  </View>
                )}
              </View>

              <View className="bg-blue-50 dark:bg-brand/20 rounded-xl px-3 py-2 flex-row items-center mb-2 self-start">
                <Ionicons name="calendar" size={16} color="#00A6F6" />
                <Text className="text-sm font-semibold text-brand ml-1.5">
                  {formatScheduledDate(item.scheduled_at)}
                </Text>
              </View>
              {item.note ? (
                <Text
                  className="text-sm text-gray-600 dark:text-gray-300 mb-3"
                  numberOfLines={2}
                >
                  {item.note}
                </Text>
              ) : null}

              {!isMine && (
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    respond(item);
                  }}
                  className="bg-brand rounded-2xl py-3 items-center"
                >
                  <Text className="text-white font-bold">
                    Odpri chat
                  </Text>
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
            className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-md"
            style={{ maxHeight: "85%" }}
          >
            {selectedBone && (() => {
              const b = selectedBone;
              const ri = b.restaurant_info;
              const isMine = me && b.user_id === me.id;
              const isPrivate = b.visibility === "private";
              return (
                <>
                  <View className="flex-row items-center justify-between px-5 pt-5 pb-2">
                    <Text className="text-lg font-bold text-gray-900 dark:text-white">
                      {isPrivate ? "Zasebni bon" : "Javni bon"}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      {isMine && (
                        <Pressable
                          onPress={() => confirmCancelBone(b)}
                          className="rounded-full bg-red-50 dark:bg-red-500/10 px-3 py-1.5"
                        >
                          <Text className="text-xs font-semibold text-red-500 dark:text-red-300">
                            Umakni bon
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => setSelectedBone(null)}
                        hitSlop={10}
                      >
                        <Ionicons name="close" size={26} color="#888" />
                      </Pressable>
                    </View>
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
                          <View className="w-12 h-12 rounded-full bg-brand-light dark:bg-neutral-800 items-center justify-center">
                            <Text className="font-bold text-brand-dark dark:text-brand">
                              {b.author.name[0]}
                            </Text>
                          </View>
                        )}
                        <View className="ml-3 flex-1">
                          <Text className="font-semibold text-gray-900 dark:text-white">
                            {b.author.name}
                          </Text>
                          <Text className="text-xs text-gray-400 dark:text-gray-500">
                            {b.author.faculty}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View className="flex-row flex-wrap gap-2 mb-4">
                      {isMine && (
                        <View className="rounded-full bg-brand/10 px-3 py-1">
                          <Text className="text-xs font-semibold text-brand">
                            Tvoj bon
                          </Text>
                        </View>
                      )}
                      <View
                        className={`rounded-full px-3 py-1 ${
                          isPrivate
                            ? "bg-gray-100 dark:bg-neutral-800"
                            : "bg-blue-50 dark:bg-brand/20"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isPrivate
                              ? "text-gray-500 dark:text-gray-300"
                              : "text-brand"
                          }`}
                        >
                          {isPrivate ? "Zasebno" : "Javno"}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-start mb-2">
                      <Ionicons
                        name="restaurant"
                        size={18}
                        color="#00A6F6"
                        style={{ marginTop: 3 }}
                      />
                      <Text className="flex-1 font-bold text-lg text-gray-900 dark:text-white ml-2">
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
                      <Text className="text-xs text-gray-500 dark:text-gray-400 ml-7 mb-1">
                        {[ri.address, ri.city].filter(Boolean).join(", ")}
                      </Text>
                    )}
                    {ri?.supplement_price != null && (
                      <View className="flex-row items-center ml-7 gap-2 mb-3">
                        <Text className="text-xs font-semibold text-green-600 dark:text-green-400">
                          {Number(ri.supplement_price).toFixed(2)} EUR doplačilo
                        </Text>
                        {ri.meal_price != null && (
                          <Text className="text-xs text-gray-400 dark:text-gray-500">
                            (cena obroka {Number(ri.meal_price).toFixed(2)})
                          </Text>
                        )}
                      </View>
                    )}

                    <View className="bg-blue-50 dark:bg-brand/20 rounded-xl px-3 py-2 flex-row items-center mt-2 mb-3 self-start">
                      <Ionicons name="calendar" size={16} color="#00A6F6" />
                      <Text className="text-sm font-semibold text-brand ml-1.5">
                        {formatScheduledDate(b.scheduled_at)}
                      </Text>
                    </View>

                    {b.note ? (
                      <View className="bg-gray-50 dark:bg-neutral-800 rounded-2xl p-4 mb-4">
                        <Text className="text-sm text-gray-700 dark:text-gray-200 leading-5">
                          {b.note}
                        </Text>
                      </View>
                    ) : null}

                    {!isMine && (
                      <Pressable
                        onPress={() => {
                          setSelectedBone(null);
                          respond(b);
                        }}
                        className="bg-brand rounded-2xl py-4 items-center"
                      >
                        <Text className="text-white font-bold text-base">
                          Odpri chat
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
