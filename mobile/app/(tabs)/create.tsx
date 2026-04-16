import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { supabase, type Profile } from "../../lib/supabase";
import { RESTAURANTS as FALLBACK } from "../../lib/restaurants";
import { createGuard } from "../../lib/createGuard";

const HOURS = Array.from({ length: 16 }, (_, i) => {
  const h = 8 + i;
  return [`${h}:00`, `${h}:30`];
}).flat();

const SLOVENIAN_DAYS = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

function buildDayOptions() {
  const options: { offset: number; label: string; sublabel: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const sublabel = `${day}.${month}.`;
    if (i === 0) options.push({ offset: 0, label: "Danes", sublabel });
    else if (i === 1) options.push({ offset: 1, label: "Jutri", sublabel });
    else
      options.push({
        offset: i,
        label: SLOVENIAN_DAYS[d.getDay()],
        sublabel,
      });
  }
  return options;
}

const DAY_OPTIONS = buildDayOptions();

type Restaurant = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  supplement_price: number | null;
  meal_price: number | null;
  rating: number | null;
  features: string[] | null;
};
type Buddy = { matchId: string; profile: Profile };

export default function CreateBone() {
  const scrollRef = useRef<ScrollView>(null);
  const [noteFocused, setNoteFocused] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(true);
  const [showAllModal, setShowAllModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Private invite selection state
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [loadingBuddies, setLoadingBuddies] = useState(false);
  const [selectedBuddies, setSelectedBuddies] = useState<Set<string>>(
    new Set()
  );
  const [meId, setMeId] = useState<string | null>(null);

  async function loadBuddies(profileId: string) {
    setLoadingBuddies(true);
    try {
      const { data: matches } = await supabase
        .from("buddy_matches")
        .select("id, user1_id, user2_id")
        .or(`user1_id.eq.${profileId},user2_id.eq.${profileId}`);

      const out: Buddy[] = [];
      for (const m of matches ?? []) {
        const otherId = m.user1_id === profileId ? m.user2_id : m.user1_id;
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherId)
          .single();
        if (p) out.push({ matchId: m.id, profile: p as Profile });
      }
      setBuddies(out);
      setSelectedBuddies((prev) => {
        const validIds = new Set(out.map((buddy) => buddy.matchId));
        return new Set([...prev].filter((id) => validIds.has(id)));
      });
    } finally {
      setLoadingBuddies(false);
    }
  }

  // Snap the ScrollView back to the top every time the user navigates to
  // this screen.
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (restaurants.length === 0) setLoadingList(true);
        const { data, error } = await supabase
          .from("restaurants")
          .select("id, name, city, address, supplement_price, meal_price, rating, features")
          .order("name");
        if (error || !data || data.length === 0) {
          setRestaurants(
            FALLBACK.map((name, i) => ({
              id: String(i),
              name,
              city: null,
              address: null,
              supplement_price: null,
              meal_price: null,
              rating: null,
              features: null,
            }))
          );
        } else {
          setRestaurants(data as Restaurant[]);
        }
        setLoadingList(false);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: me } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (me) {
          setMeId(me.id);
          await loadBuddies(me.id);
        }
      })();
    }, [])
  );

  const q = search.toLowerCase();
  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      (r.city && r.city.toLowerCase().includes(q)) ||
      (r.address && r.address.toLowerCase().includes(q))
  );

  function getScheduledDate() {
    const now = new Date();
    const date = new Date(now);
    date.setDate(date.getDate() + selectedDate);
    if (selectedTime) {
      const [h, m] = selectedTime.split(":").map(Number);
      date.setHours(h, m, 0, 0);
    }
    return date;
  }

  function getScheduledAt() {
    return getScheduledDate().toISOString();
  }

  // A time slot is in the past only when "Today" is selected and the slot's
  // hour/minute has already passed.
  function isTimeSlotPast(t: string) {
    if (selectedDate !== 0) return false;
    const [h, m] = t.split(":").map(Number);
    const slot = new Date();
    slot.setHours(h, m, 0, 0);
    return slot.getTime() <= Date.now();
  }

  // If the user switches to Today and their previously picked time is now in
  // the past, clear it so they can't submit a stale bone.
  useEffect(() => {
    if (selectedTime && isTimeSlotPast(selectedTime)) {
      setSelectedTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  function toggleBuddy(matchId: string) {
    setSelectedBuddies((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  function toggleAllBuddies() {
    setSelectedBuddies((prev) => {
      const allIds = buddies.map((buddy) => buddy.matchId);
      const selectedCount = allIds.filter((id) => prev.has(id)).length;
      if (selectedCount === allIds.length) return new Set();
      return new Set(allIds);
    });
  }

  function reset() {
    setRestaurant(null);
    setSearch("");
    setShowPicker(true);
    setSelectedTime("");
    setNote("");
    setVisibility("public");
    setSelectedDate(0);
    setSelectedBuddies(new Set());
    createGuard.dirty = false;
  }

  // Track dirty state for navigation guard
  useEffect(() => {
    createGuard.dirty = !!(restaurant?.name || selectedTime || note.trim());
  }, [restaurant, selectedTime, note]);

  useEffect(() => {
    createGuard.reset = reset;
    return () => {
      createGuard.reset = null;
    };
  }, []);

  async function submit() {
    if (!restaurant) return Toast.show({ type: "error", text1: "Izberi restavracijo." });
    if (!selectedTime) return Toast.show({ type: "error", text1: "Izberi uro." });
    if (getScheduledDate().getTime() <= Date.now()) {
      return Toast.show({
        type: "error",
        text1: "Izbrani čas je že mimo.",
        text2: "Izberi čas v prihodnosti.",
      });
    }

    setLoading(true);
    try {
      if (!meId) throw new Error("No profile");
      const scheduledAt = getScheduledAt();
      const restaurantInfo = {
        address: restaurant.address,
        city: restaurant.city,
        rating: restaurant.rating,
        supplement_price: restaurant.supplement_price,
        meal_price: restaurant.meal_price,
      };

      if (visibility === "private") {
        const selectedMatchIds = buddies
          .map((buddy) => buddy.matchId)
          .filter((matchId) => selectedBuddies.has(matchId));
        if (selectedMatchIds.length === 0) {
          return Toast.show({
            type: "error",
            text1: "Izberi vsaj enega buddyja.",
          });
        }

        const { error } = await supabase.rpc("create_private_meal_invites", {
          p_match_ids: selectedMatchIds,
          p_restaurant: restaurant.name,
          p_restaurant_info: restaurantInfo,
          p_scheduled_at: scheduledAt,
          p_note: note.trim() || null,
        });
        if (error) throw error;

        const n = selectedMatchIds.length;
        reset();
        Toast.show({
          type: "success",
          text1: "Objavljeno!",
          text2: `${n} buddy${n === 1 ? "" : "jev"} vidi tvoj bon.`,
        });
        router.navigate("/(tabs)/feed");
        return;
      }

      const { error } = await supabase.from("meal_invites").insert({
        user_id: meId,
        restaurant: restaurant.name,
        restaurant_info: restaurantInfo,
        scheduled_at: scheduledAt,
        note: note.trim() || null,
        visibility: "public",
        status: "open",
      });
      if (error) throw error;

      reset();
      Toast.show({ type: "success", text1: "Objavljeno!", text2: "Tvoj bon je objavljen." });
      router.navigate("/(tabs)/feed");
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Napaka", text2: e.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-gray-50 dark:bg-neutral-950"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollRef}
          className="flex-1 bg-gray-50 dark:bg-neutral-950"
          contentContainerStyle={{ paddingBottom: noteFocused ? 120 : 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        <View className="pt-16 px-6 pb-2">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">Nov bon</Text>
          <Text className="text-gray-500 dark:text-gray-400 mt-1">Povabi nekoga na kosilo</Text>
        </View>

        {/* Restaurant */}
        <View className="bg-white dark:bg-neutral-900 mx-4 mt-4 rounded-3xl px-5 py-4 shadow-sm">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Restavracija
          </Text>

          {restaurant && !showPicker ? (
            <TouchableOpacity
              activeOpacity={0.6}
              onPressIn={() => {
                setRestaurant(null);
                setShowPicker(true);
                setSearch("");

              }}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-row flex-1 mr-3">
                  <Ionicons name="restaurant" size={18} color="#00A6F6" style={{ marginTop: 2 }} />
                  <View className="ml-2 flex-1">
                    <Text className="text-base text-gray-900 dark:text-white font-semibold">
                      {restaurant?.name}
                    </Text>
                    <View className="flex-row items-center mt-0.5 gap-2">
                      {restaurant?.rating != null && restaurant.rating > 0 && (
                        <View className="flex-row items-center">
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text className="text-xs font-semibold text-amber-500 ml-0.5">
                            {restaurant.rating}
                          </Text>
                        </View>
                      )}
                      <Text className="text-xs text-gray-400 dark:text-gray-500">
                        {[restaurant?.address, restaurant?.city].filter(Boolean).join(", ")}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="close-circle" size={22} color="#999" style={{ marginTop: 2 }} />
              </View>
              {restaurant?.supplement_price != null && (
                <View className="flex-row items-center mt-0.5 ml-7 gap-2">
                  <Text className="text-xs font-semibold text-green-600 dark:text-green-400">
                    {Number(restaurant.supplement_price).toFixed(2)} EUR doplačilo
                  </Text>
                  {restaurant.meal_price != null && (
                    <Text className="text-xs text-gray-400 dark:text-gray-500">
                      (cena obroka {Number(restaurant.meal_price).toFixed(2)})
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <>
            <View className="flex-row items-center bg-gray-50 dark:bg-neutral-800 rounded-2xl px-4 py-3 mb-2">
              <Ionicons name="search" size={18} color="#999" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Išči restavracijo..."
                placeholderTextColor="#888"
                className="flex-1 ml-2 text-base text-gray-900 dark:text-white"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={18} color="#ccc" />
                </Pressable>
              )}
            </View>

            <View style={{ maxHeight: 240 }}>
              {loadingList ? (
                <ActivityIndicator color="#00A6F6" className="py-4" />
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {filtered.slice(0, 30).map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => {
                        setRestaurant(r);
                        setSearch("");
                        setShowPicker(false);
                        Keyboard.dismiss();
                      }}
                      className="flex-row items-center py-3 px-3 rounded-2xl active:bg-gray-50 dark:active:bg-neutral-800"
                    >
                      <Ionicons
                        name="restaurant-outline"
                        size={16}
                        color="#999"
                      />
                      <View className="ml-2 flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            className="flex-1 text-base text-gray-800 dark:text-gray-100"
                            numberOfLines={1}
                          >
                            {r.name}
                          </Text>
                          {r.rating != null && r.rating > 0 && (
                            <View className="flex-row items-center shrink-0">
                              <Ionicons name="star" size={12} color="#F59E0B" />
                              <Text className="text-xs font-semibold text-amber-500 ml-0.5">
                                {r.rating}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-gray-400 dark:text-gray-500" numberOfLines={1}>
                          {[r.address, r.city]
                            .filter(Boolean)
                            .join(", ")}
                        </Text>
                        {r.supplement_price != null && (
                          <View className="flex-row items-center gap-2">
                            <Text className="text-xs font-semibold text-green-600 dark:text-green-400">
                              {Number(r.supplement_price).toFixed(2)} EUR doplačilo
                            </Text>
                            {r.meal_price != null && (
                              <Text className="text-xs text-gray-400 dark:text-gray-500">
                                (cena obroka {Number(r.meal_price).toFixed(2)})
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </Pressable>
                  ))}
                  {filtered.length === 0 && search.length > 0 && (
                    <Pressable
                      onPress={async () => {
                        const name = search.trim();
                        setRestaurant({
                          id: "custom",
                          name,
                          city: null,
                          address: null,
                          supplement_price: null,
                          meal_price: null,
                          rating: null,
                          features: null,
                        });
                        setSearch("");
                        setShowPicker(false);
                        Keyboard.dismiss();
                        await supabase
                          .from("restaurants")
                          .insert({ name });
                      }}
                      className="flex-row items-center py-3 px-3 rounded-2xl"
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={16}
                        color="#00A6F6"
                      />
                      <Text className="ml-2 text-base text-brand font-semibold">
                        Dodaj &quot;{search.trim()}&quot;
                      </Text>
                    </Pressable>
                  )}
                  {filtered.length > 30 && (
                    <Pressable
                      onPress={() => { setShowAllModal(true); setModalSearch(search); }}
                      className="py-3 px-3 items-center"
                    >
                      <Text className="text-brand font-semibold text-sm">
                        Poglej vse ({filtered.length})
                      </Text>
                    </Pressable>
                  )}
                </ScrollView>
              )}
            </View>
          </>
          )}
        </View>

        {/* Date */}
        <View className="bg-white dark:bg-neutral-900 mx-4 mt-4 rounded-3xl px-5 py-4 shadow-sm">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Kdaj</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="mb-4"
          >
            <View className="flex-row gap-2">
              {DAY_OPTIONS.map((d) => (
                <Pressable
                  key={d.offset}
                  onPress={() => setSelectedDate(d.offset)}
                  className={`py-3 px-4 rounded-2xl items-center min-w-[72px] ${selectedDate === d.offset ? "bg-brand" : "bg-gray-100 dark:bg-neutral-800"}`}
                >
                  <Text
                    className={`font-semibold ${selectedDate === d.offset ? "text-white" : "text-gray-700 dark:text-gray-200"}`}
                  >
                    {d.label}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${selectedDate === d.offset ? "text-blue-100" : "text-gray-400 dark:text-gray-500"}`}
                  >
                    {d.sublabel}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Ura</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-row gap-2">
              {HOURS.filter((t) => !isTimeSlotPast(t)).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setSelectedTime(t)}
                  className={`px-4 py-2.5 rounded-xl ${selectedTime === t ? "bg-brand" : "bg-gray-100 dark:bg-neutral-800"}`}
                >
                  <Text
                    className={`text-sm font-semibold ${selectedTime === t ? "text-white" : "text-gray-700 dark:text-gray-200"}`}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Visibility */}
        <View className="bg-white dark:bg-neutral-900 mx-4 mt-4 rounded-3xl px-5 py-4 shadow-sm">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Vidnost
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setVisibility("public")}
              className={`flex-1 py-4 rounded-2xl items-center ${visibility === "public" ? "bg-brand" : "bg-gray-100 dark:bg-neutral-800"}`}
            >
              <Ionicons
                name="earth"
                size={24}
                color={visibility === "public" ? "#fff" : "#999"}
              />
              <Text
                className={`font-semibold mt-1 ${visibility === "public" ? "text-white" : "text-gray-700 dark:text-gray-200"}`}
              >
                Javno
              </Text>
              <Text
                className={`text-xs mt-0.5 ${visibility === "public" ? "text-blue-100" : "text-gray-400 dark:text-gray-500"}`}
              >
                Vsi vidijo
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVisibility("private")}
              className={`flex-1 py-4 rounded-2xl items-center ${visibility === "private" ? "bg-brand" : "bg-gray-100 dark:bg-neutral-800"}`}
            >
              <Ionicons
                name="lock-closed"
                size={24}
                color={visibility === "private" ? "#fff" : "#999"}
              />
              <Text
                className={`font-semibold mt-1 ${visibility === "private" ? "text-white" : "text-gray-700 dark:text-gray-200"}`}
              >
                Zasebno
              </Text>
              <Text
                className={`text-xs mt-0.5 ${visibility === "private" ? "text-blue-100" : "text-gray-400 dark:text-gray-500"}`}
              >
                Samo buddies
              </Text>
            </Pressable>
          </View>

          {visibility === "private" && (
            <View className="mt-4 border-t border-gray-100 dark:border-neutral-800 pt-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  Povabi buddyje
                </Text>
                {buddies.length > 0 && (
                  <Text className="text-xs font-semibold text-brand">
                    {
                      buddies.filter((buddy) =>
                        selectedBuddies.has(buddy.matchId)
                      ).length
                    }
                    /{buddies.length}
                  </Text>
                )}
              </View>

              {loadingBuddies ? (
                <ActivityIndicator color="#00A6F6" className="py-4" />
              ) : buddies.length === 0 ? (
                <View className="items-center py-6">
                  <Ionicons name="people-outline" size={36} color="#888" />
                  <Text className="text-gray-400 dark:text-gray-500 mt-2">
                    Še nimaš buddyjev
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {(() => {
                    const selectedCount = buddies.filter((buddy) =>
                      selectedBuddies.has(buddy.matchId)
                    ).length;
                    const selected = selectedCount === buddies.length;
                    return (
                      <Pressable
                        onPress={toggleAllBuddies}
                        className={`rounded-2xl p-4 flex-row items-center ${selected ? "bg-blue-50 dark:bg-brand/20 border-2 border-brand" : "bg-gray-50 dark:bg-neutral-800"}`}
                      >
                        <View className="w-12 h-12 rounded-full bg-brand-light dark:bg-neutral-900 items-center justify-center">
                          <Ionicons name="people" size={22} color="#00A6F6" />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className="font-bold text-gray-900 dark:text-white">
                            Povabi vse
                          </Text>
                          <Text className="text-xs text-gray-400 dark:text-gray-500">
                            Vsi tvoji buddyji
                          </Text>
                        </View>
                        <View
                          className={`w-7 h-7 rounded-full items-center justify-center ${selected ? "bg-brand" : "bg-gray-200 dark:bg-neutral-700"}`}
                        >
                          {selected && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })()}

                  {buddies.map((buddy) => {
                    const selected = selectedBuddies.has(buddy.matchId);
                    return (
                      <Pressable
                        key={buddy.matchId}
                        onPress={() => toggleBuddy(buddy.matchId)}
                        className={`rounded-2xl p-4 flex-row items-center ${selected ? "bg-blue-50 dark:bg-brand/20 border-2 border-brand" : "bg-gray-50 dark:bg-neutral-800"}`}
                      >
                        {buddy.profile.photos[0] ? (
                          <Image
                            source={{ uri: buddy.profile.photos[0] }}
                            style={{ width: 48, height: 48, borderRadius: 24 }}
                          />
                        ) : (
                          <View
                            style={{ width: 48, height: 48, borderRadius: 24 }}
                            className="bg-brand-light dark:bg-neutral-900 items-center justify-center"
                          >
                            <Text className="font-bold text-brand-dark dark:text-brand">
                              {buddy.profile.name[0]}
                            </Text>
                          </View>
                        )}
                        <View className="flex-1 ml-3">
                          <Text className="font-bold text-gray-900 dark:text-white">
                            {buddy.profile.name}
                          </Text>
                          <Text className="text-xs text-gray-400 dark:text-gray-500">
                            {buddy.profile.faculty}
                          </Text>
                        </View>
                        <View
                          className={`w-7 h-7 rounded-full items-center justify-center ${selected ? "bg-brand" : "bg-gray-200 dark:bg-neutral-700"}`}
                        >
                          {selected && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Note */}
        <View className="bg-white dark:bg-neutral-900 mx-4 mt-4 rounded-3xl px-5 py-4 shadow-sm">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Opis (opcijsko)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Npr. Iščem družbo za kosilo..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit
            onFocus={() => {
              setNoteFocused(true);
              setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              }, 250);
            }}
            onBlur={() => setNoteFocused(false)}
            className="text-base text-gray-900 dark:text-white min-h-20 bg-gray-50 dark:bg-neutral-800 rounded-2xl px-4 py-3"
          />
        </View>

        {/* Button */}
        <View className="mx-4 mt-6">
          <Pressable
            onPress={submit}
            disabled={loading}
            className="bg-brand rounded-2xl py-4 items-center shadow-sm"
          >
            <Text className="text-white font-bold text-base">
              {loading ? "..." : "Objavi bon"}
            </Text>
          </Pressable>
        </View>

        {/* Browse all restaurants modal */}
        <Modal
          visible={showAllModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAllModal(false)}
        >
          <View className="flex-1 bg-gray-50 dark:bg-neutral-950">
            <View className="flex-row items-center px-5 pt-16 pb-3 bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800">
              <Pressable onPress={() => setShowAllModal(false)}>
                <Ionicons name="close" size={28} color="#888" />
              </Pressable>
              <Text className="text-lg font-bold text-gray-900 dark:text-white ml-3">
                Vse restavracije
              </Text>
            </View>

            <View className="flex-row items-center bg-white dark:bg-neutral-900 mx-4 mt-3 rounded-2xl px-4 py-3">
              <Ionicons name="search" size={18} color="#999" />
              <TextInput
                value={modalSearch}
                onChangeText={setModalSearch}
                placeholder="Išči restavracijo..."
                placeholderTextColor="#888"
                className="flex-1 ml-2 text-base text-gray-900 dark:text-white"
                autoCorrect={false}
                autoFocus
              />
              {modalSearch.length > 0 && (
                <Pressable onPress={() => setModalSearch("")}>
                  <Ionicons name="close-circle" size={18} color="#888" />
                </Pressable>
              )}
            </View>

            <FlatList
              data={restaurants.filter((r) => {
                if (!modalSearch.trim()) return true;
                const q = modalSearch.toLowerCase();
                return (
                  r.name.toLowerCase().includes(q) ||
                  (r.city && r.city.toLowerCase().includes(q)) ||
                  (r.address && r.address.toLowerCase().includes(q))
                );
              })}
              keyExtractor={(r) => r.id}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={5}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              renderItem={({ item: r }) => (
                <Pressable
                  onPress={() => {
                    setRestaurant(r);
                    setSearch("");
                    setShowPicker(false);
                    setShowAllModal(false);
                    setModalSearch("");
                  }}
                  className="flex-row items-center py-3 px-3 mb-1 bg-white dark:bg-neutral-900 rounded-2xl"
                >
                  <Ionicons name="restaurant-outline" size={16} color="#999" />
                  <View className="ml-2 flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        className="flex-1 text-base text-gray-800 dark:text-gray-100"
                        numberOfLines={1}
                      >
                        {r.name}
                      </Text>
                      {r.rating != null && r.rating > 0 && (
                        <View className="flex-row items-center shrink-0">
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text className="text-xs font-semibold text-amber-500 ml-0.5">
                            {r.rating}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-gray-400 dark:text-gray-500" numberOfLines={1}>
                      {[r.address, r.city].filter(Boolean).join(", ")}
                    </Text>
                    {r.supplement_price != null && (
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs font-semibold text-green-600 dark:text-green-400">
                          {Number(r.supplement_price).toFixed(2)} EUR doplačilo
                        </Text>
                        {r.meal_price != null && (
                          <Text className="text-xs text-gray-400 dark:text-gray-500">
                            (cena obroka {Number(r.meal_price).toFixed(2)})
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                modalSearch.length > 0 ? (
                  <View className="items-center py-8">
                    <Text className="text-gray-400 dark:text-gray-500">Ni rezultatov</Text>
                  </View>
                ) : null
              }
            />
          </View>
        </Modal>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
