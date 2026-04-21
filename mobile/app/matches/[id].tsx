import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  Image,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { RealtimeChannel } from "@supabase/supabase-js";
import * as Calendar from "expo-calendar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatScheduledDate } from "../../lib/formatDate";
import {
  supabase,
  type Message,
  type Profile,
} from "../../lib/supabase";

type InviteCard = {
  type: "bone_invite";
  bone_id: string;
  restaurant: string;
  restaurant_address?: string | null;
  restaurant_city?: string | null;
  restaurant_rating?: number | null;
  restaurant_supplement?: number | null;
  restaurant_meal_price?: number | null;
  scheduled_at: string;
  note: string | null;
};

type InviteState = {
  status: string;
  sourcePublicInviteId: string | null;
};

type RestaurantInfo = {
  name: string;
  address: string | null;
  city: string | null;
  supplement_price: number | null;
  meal_price: number | null;
  rating: number | null;
};

function parseInviteCard(content: string): InviteCard | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "bone_invite") return parsed;
  } catch {}
  return null;
}

function sortMessages(a: Message, b: Message) {
  const timeDelta = Date.parse(a.created_at) - Date.parse(b.created_at);
  if (timeDelta !== 0) return timeDelta;
  return a.id.localeCompare(b.id);
}

function upsertMessage(prev: Message[], incoming: Message) {
  if (prev.some((message) => message.id === incoming.id)) return prev;

  const tempIdx = prev.findIndex(
    (message) =>
      message.id.startsWith("temp-") &&
      message.sender_id === incoming.sender_id &&
      message.content === incoming.content
  );

  if (tempIdx >= 0) {
    const next = [...prev];
    next[tempIdx] = incoming;
    next.sort(sortMessages);
    return next;
  }

  return [...prev, incoming].sort(sortMessages);
}

function mergeMessages(prev: Message[], incoming: Message[]) {
  return incoming.reduce((next, message) => upsertMessage(next, message), prev);
}

export default function Chat() {
  const { id: matchId, prefill } = useLocalSearchParams<{
    id: string;
    prefill?: string;
  }>();
  const [me, setMe] = useState<Profile | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inviteStates, setInviteStates] = useState<Record<string, InviteState>>(
    {}
  );
  const [restMap, setRestMap] = useState<Map<string, RestaurantInfo>>(new Map());
  const [text, setText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [androidKeyboardInset, setAndroidKeyboardInset] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const prefillApplied = useRef(false);
  const matchClosedRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const channelReadyRef = useRef(false);
  const latestMessageRef = useRef<Message | null>(null);

  useEffect(() => {
    latestMessageRef.current = messages.length > 0 ? messages[messages.length - 1] : null;
  }, [messages]);

  function leaveRemovedBuddy(message = "Ta buddy ni več na voljo.") {
    if (matchClosedRef.current) return;
    matchClosedRef.current = true;
    setShowMenu(false);
    setOther(null);
    setMessages([]);
    Alert.alert("Buddy odstranjen", message, [
      {
        text: "V redu",
        onPress: () => router.replace("/matches"),
      },
    ]);
  }

  async function handleMatchActionError(message: string) {
    if (!matchId) {
      Alert.alert("Napaka", message);
      return;
    }

    const { data: match, error } = await supabase
      .from("buddy_matches")
      .select("id")
      .eq("id", matchId)
      .maybeSingle();

    if (!error && !match) {
      leaveRemovedBuddy("Ta buddy je bil odstranjen.");
      return;
    }

    Alert.alert("Napaka", message);
  }

  function removeBuddy() {
    if (!other || !matchId) return;

    setShowMenu(false);
    Alert.alert(
      "Odstrani buddyja",
      `Ali res želiš odstraniti ${other.name}?`,
      [
        { text: "Prekliči", style: "cancel" },
        {
          text: "Odstrani",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.rpc("remove_buddy", {
              p_match_id: matchId,
            });

            if (error) {
              await handleMatchActionError(error.message);
              return;
            }

            leaveRemovedBuddy("Ta buddy je bil odstranjen.");
          },
        },
      ]
    );
  }

  useEffect(() => {
    if (prefill && !prefillApplied.current) {
      setText(prefill);
      prefillApplied.current = true;
    }
  }, [prefill]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      const nextInset = Math.max(0, event.endCoordinates.height - insets.bottom);
      setAndroidKeyboardInset(nextInset);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setAndroidKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  // Fetch all restaurants for info lookup
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("name, address, city, supplement_price, meal_price, rating");
      if (data && data.length > 0) {
        setRestMap(
          new Map(data.map((r: any) => [r.name, r as RestaurantInfo]))
        );
      }
    })();
  }, []);

  // Fetch bone statuses for any invite card messages we don't have yet
  useEffect(() => {
    const unknownIds = messages
      .map((m) => parseInviteCard(m.content))
      .filter((inv): inv is InviteCard => inv !== null)
      .map((inv) => inv.bone_id)
      .filter((id) => !(id in inviteStates));

    if (unknownIds.length === 0) return;

    (async () => {
      const { data } = await supabase
        .from("meal_invites")
        .select("id, status, source_public_invite_id")
        .in("id", unknownIds);
      if (data) {
        setInviteStates((prev) => {
          const next = { ...prev };
          for (const b of data as {
            id: string;
            status: string;
            source_public_invite_id: string | null;
          }[]) {
            next[b.id] = {
              status: b.status,
              sourcePublicInviteId: b.source_public_invite_id,
            };
          }
          return next;
        });
      }
    })();
  }, [inviteStates, messages]);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    let polling = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: myP } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (!myP || cancelled) return;
      setMe(myP as Profile);

      const [
        { data: m },
        { data: msgs },
      ] = await Promise.all([
        supabase.from("buddy_matches").select("*").eq("id", matchId).maybeSingle(),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true }),
      ]);

      if (!m) {
        if (!cancelled) {
          leaveRemovedBuddy("Ta buddy je bil odstranjen.");
        }
        return;
      }

      if (!cancelled) {
        setMessages(((msgs ?? []) as Message[]).sort(sortMessages));
      }

      const otherId =
        m.user1_id === (myP as Profile).id ? m.user2_id : m.user1_id;
      const { data: o } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherId)
        .single();
      if (cancelled) return;
      setOther(o as Profile);
    })();

    const channel = supabase
      .channel(`chat-${matchId}`, {
        config: {
          broadcast: {
            self: false,
          },
        },
      })
      .on("broadcast", { event: "chat-message" }, ({ payload }) => {
        const message = (payload as { message?: Message }).message;
        if (!message || message.match_id !== matchId) return;
        setMessages((prev) => upsertMessage(prev, message));
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => upsertMessage(prev, newMsg));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meal_invites",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            status: string;
            source_public_invite_id?: string | null;
          };
          setInviteStates((prev) => ({
            ...prev,
            [updated.id]: {
              status: updated.status,
              sourcePublicInviteId:
                updated.source_public_invite_id ??
                prev[updated.id]?.sourcePublicInviteId ??
                null,
            },
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "buddy_matches",
          filter: `id=eq.${matchId}`,
        },
        () => {
          leaveRemovedBuddy("Ta buddy je bil odstranjen.");
        }
      )
      .subscribe((status) => {
        channelReadyRef.current = status === "SUBSCRIBED";
      });

    channelRef.current = channel;

    const pollMessages = async () => {
      if (polling || cancelled) return;
      polling = true;

      const latestMessage = latestMessageRef.current;
      let query = supabase
        .from("chat_messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (latestMessage) {
        query = query.gt("created_at", latestMessage.created_at);
      }

      const { data } = await query;
      if (!cancelled && data && data.length > 0) {
        setMessages((prev) => mergeMessages(prev, data as Message[]));
      }

      polling = false;
    };

    const pollInterval = setInterval(() => {
      void pollMessages();
    }, 1000);

    return () => {
      cancelled = true;
      channelReadyRef.current = false;
      channelRef.current = null;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  async function send() {
    if (!text.trim() || !me) return;
    const content = text.trim();
    setText("");

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      match_id: matchId!,
      sender_id: me.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        match_id: matchId,
        sender_id: me.id,
        content,
      })
      .select("*")
      .single();

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      await handleMatchActionError(error.message);
    } else if (data) {
      const savedMessage = data as Message;
      setMessages((prev) => upsertMessage(prev, savedMessage));

      if (channelRef.current && channelReadyRef.current) {
        void channelRef.current.send({
          type: "broadcast",
          event: "chat-message",
          payload: { message: savedMessage },
        });
      }
    }
  }

  async function addToCalendar(invite: InviteCard) {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") return;

    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT
    );
    const defaultCal =
      calendars.find((c) => c.isPrimary) ??
      calendars.find((c) => c.allowsModifications) ??
      calendars[0];
    if (!defaultCal) return;

    const start = new Date(invite.scheduled_at);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour

    await Calendar.createEventAsync(defaultCal.id, {
      title: `Boni Buddy: ${invite.restaurant}`,
      startDate: start,
      endDate: end,
      notes: invite.note ?? undefined,
    });
  }

  async function respondToInvite(
    boneId: string,
    response: "accepted" | "declined",
    invite?: InviteCard
  ) {
    const { error } = await supabase.rpc("respond_to_bone_invite", {
      p_bone_id: boneId,
      p_response: response,
    });
    if (error) {
      await handleMatchActionError(error.message);
      return;
    }
    setInviteStates((prev) => ({
      ...prev,
      [boneId]: {
        status: response,
        sourcePublicInviteId: prev[boneId]?.sourcePublicInviteId ?? null,
      },
    }));

    if (response === "accepted") {
      if (invite) {
        Alert.alert("Sprejeto!", "Dodaj v koledar?", [
          { text: "Ne" },
          {
            text: "Dodaj",
            onPress: () => addToCalendar(invite),
          },
        ]);
      }
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-gray-50 dark:bg-neutral-950"
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-16 pb-3 bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#888" />
        </Pressable>
        {other && (
          <Pressable
            onPress={() => router.push(`/profile-detail?id=${other.id}`)}
            className="flex-row items-center flex-1"
          >
            {other.photos[0] ? (
              <Image
                source={{ uri: other.photos[0] }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            ) : (
              <View className="w-9 h-9 rounded-full bg-brand-light dark:bg-neutral-800 items-center justify-center">
                <Text className="font-bold text-brand-dark dark:text-brand text-sm">
                  {other.name[0]}
                </Text>
              </View>
            )}
            <View className="ml-2.5">
              <Text className="font-bold text-base text-gray-900 dark:text-white">
                {other.name}
              </Text>
              <Text className="text-xs text-gray-400 dark:text-gray-500">{other.faculty}</Text>
            </View>
          </Pressable>
        )}
        <Pressable
          onPress={() => setShowMenu(true)}
          className="w-9 h-9 rounded-full bg-gray-100 dark:bg-neutral-800 items-center justify-center"
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#999" />
        </Pressable>
      </View>

      <View
        className="flex-1"
        style={Platform.OS === "android" ? { paddingBottom: androidKeyboardInset } : undefined}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: composerHeight + 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((item) => {
            const mine = me && item.sender_id === me.id;
            const invite = parseInviteCard(item.content);

            if (invite) {
              const inviteState = inviteStates[invite.bone_id];
              const status = inviteState?.status;
              const isLegacyPublicResponse =
                inviteState?.sourcePublicInviteId != null;
              // Use embedded data from invite, fall back to restMap for old messages
              const fallback = restMap.get(invite.restaurant);
              const rating = invite.restaurant_rating ?? fallback?.rating;
              const addr = invite.restaurant_address ?? fallback?.address;
              const city = invite.restaurant_city ?? fallback?.city;
              const supplement = invite.restaurant_supplement ?? fallback?.supplement_price;
              const mealPrice = invite.restaurant_meal_price ?? fallback?.meal_price;
              return (
                <View
                  key={item.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    width: "85%",
                  }}
                >
                  <View
                    className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl p-4 shadow-sm"
                    style={{ width: "100%" }}
                  >
                    <View className="mb-2">
                      <View className="flex-row items-start">
                        <Ionicons
                          name="restaurant"
                          size={18}
                          color="#00A6F6"
                          style={{ marginTop: 2 }}
                        />
                        <Text
                          className="font-bold text-base text-gray-900 dark:text-white ml-2"
                          style={{ flex: 1, flexShrink: 1 }}
                        >
                          {invite.restaurant}
                        </Text>
                        {rating != null && rating > 0 && (
                          <View
                            className="flex-row items-center ml-2 shrink-0"
                            style={{ marginTop: 4 }}
                          >
                            <Ionicons name="star" size={11} color="#F59E0B" />
                            <Text className="text-xs font-semibold text-amber-500 ml-0.5">
                              {rating}
                            </Text>
                          </View>
                        )}
                      </View>
                      {(addr || city) && (
                        <Text className="text-xs text-gray-400 dark:text-gray-500 ml-7">
                          {[addr, city].filter(Boolean).join(", ")}
                        </Text>
                      )}
                      {supplement != null && (
                        <View
                          className="flex-row flex-wrap items-center ml-7"
                          style={{ columnGap: 8, rowGap: 2 }}
                        >
                          <Text className="text-xs font-semibold text-green-600 dark:text-green-400">
                            {Number(supplement).toFixed(2)} EUR doplačilo
                          </Text>
                          {mealPrice != null && (
                            <Text
                              className="text-xs text-gray-400 dark:text-gray-500"
                              style={{ flexShrink: 1 }}
                            >
                              (cena obroka {Number(mealPrice).toFixed(2)})
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center mb-1">
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#999"
                      />
                      <Text className="text-sm text-gray-500 dark:text-gray-400 ml-1.5">
                        {formatScheduledDate(invite.scheduled_at)}
                      </Text>
                    </View>
                    {invite.note && (
                      <Text className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {invite.note}
                      </Text>
                    )}

                    {status === "accepted" ? (
                      <View className="mt-3 bg-green-50 dark:bg-green-500/20 rounded-xl px-4 py-3 items-center">
                        <Text className="text-green-600 dark:text-green-400 font-semibold text-sm">
                          Sprejeto
                        </Text>
                      </View>
                    ) : status === "declined" ? (
                      <View className="mt-3 bg-red-50 dark:bg-red-500/20 rounded-xl px-4 py-3 items-center">
                        <Text className="text-red-500 font-semibold text-sm">
                          Zavrnjeno
                        </Text>
                      </View>
                    ) : status === "expired" ? (
                      <View className="mt-3 bg-gray-100 dark:bg-neutral-800 rounded-xl px-4 py-3 items-center">
                        <Text className="text-gray-500 dark:text-gray-300 font-semibold text-sm">
                          Umaknjeno
                        </Text>
                      </View>
                    ) : isLegacyPublicResponse ? (
                      <View className="mt-3 bg-blue-50 dark:bg-brand/20 rounded-xl py-3 px-4 items-center">
                        <Text className="text-brand font-semibold text-sm text-center">
                          Javni bon je še odprt. Piši in se dogovorita.
                        </Text>
                      </View>
                    ) : !inviteState ? (
                      <View className="mt-3 bg-gray-100 dark:bg-neutral-800 rounded-xl px-4 py-3 items-center">
                        <Text className="text-gray-500 dark:text-gray-300 font-semibold text-sm">
                          Nalagam stanje...
                        </Text>
                      </View>
                    ) : !mine ? (
                      <View
                        className="flex-row mt-3"
                        style={{ gap: 8, alignItems: "stretch" }}
                      >
                        <Pressable
                          onPress={() =>
                            respondToInvite(invite.bone_id, "accepted", invite)
                          }
                          className="flex-1 bg-brand rounded-xl px-4 py-3 items-center"
                        >
                          <Text className="text-white font-semibold text-sm">
                            Sprejmi
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            respondToInvite(invite.bone_id, "declined")
                          }
                          className="flex-1 bg-gray-100 dark:bg-neutral-800 rounded-xl px-4 py-3 items-center"
                        >
                          <Text className="text-gray-600 dark:text-gray-200 font-semibold text-sm">
                            Zavrni
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View className="mt-3 bg-blue-50 dark:bg-brand/20 rounded-xl py-3 px-4 items-center">
                        <Text className="text-brand font-semibold text-sm">
                          Čaka na odgovor
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            }

            return (
              <View
                key={item.id}
                className={`max-w-[78%] px-4 py-3 rounded-3xl ${mine ? "self-end bg-brand" : "self-start bg-white dark:bg-neutral-900 shadow-sm"}`}
              >
                <Text className={mine ? "text-white" : "text-gray-900 dark:text-gray-100"}>
                  {item.content}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
        <View
          className="flex-row items-center gap-2 px-4 pt-3 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            onFocus={() => {
              requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              });
            }}
            placeholder="Sporočilo..."
            placeholderTextColor="#888"
            className="flex-1 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3 text-base text-gray-900 dark:text-white"
          />
          <Pressable
            onPress={send}
            className="w-11 h-11 bg-brand rounded-full items-center justify-center"
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Action menu modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          onPress={() => setShowMenu(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white dark:bg-neutral-900 rounded-t-3xl px-5 pt-3 pb-10"
          >
            <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-neutral-700 self-center mb-5" />

            {other && (
              <>
                <View className="flex-row items-center mb-5">
                  {other.photos[0] ? (
                    <Image
                      source={{ uri: other.photos[0] }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                    />
                  ) : (
                    <View
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                      className="bg-brand-light dark:bg-neutral-800 items-center justify-center"
                    >
                      <Text className="font-bold text-brand-dark dark:text-brand">
                        {other.name[0]}
                      </Text>
                    </View>
                  )}
                  <View className="ml-3">
                    <Text className="font-bold text-gray-900 dark:text-white text-base">
                      {other.name}
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-gray-500">
                      {other.faculty}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    setShowMenu(false);
                    router.push(`/profile-detail?id=${other.id}`);
                  }}
                  className="flex-row items-center py-4 px-2 rounded-2xl active:bg-gray-50 dark:active:bg-neutral-800"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: "#00A6F615" }}
                  >
                    <Ionicons name="person-outline" size={20} color="#00A6F6" />
                  </View>
                  <Text className="ml-3 text-base text-gray-800 dark:text-gray-100 font-medium">
                    Poglej profil
                  </Text>
                </Pressable>

                <Pressable
                  onPress={removeBuddy}
                  className="flex-row items-center py-4 px-2 rounded-2xl active:bg-gray-50 dark:active:bg-neutral-800"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: "#ef444415" }}
                  >
                    <Ionicons name="person-remove-outline" size={20} color="#ef4444" />
                  </View>
                  <Text className="ml-3 text-base text-gray-800 dark:text-gray-100 font-medium">
                    Odstrani buddyja
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowMenu(false);
                    Alert.alert(
                      "Blokiraj",
                      `Ali želiš blokirati ${other.name}? Ne bo mogel/la videti tvojih objav ali ti pisati.`,
                      [
                        { text: "Prekliči", style: "cancel" },
                        {
                          text: "Blokiraj",
                          style: "destructive",
                          onPress: async () => {
                            if (!me) return;
                            await supabase.from("blocked_users").insert({
                              blocker_id: me.id,
                              blocked_id: other.id,
                            });
                            router.back();
                          },
                        },
                      ]
                    );
                  }}
                  className="flex-row items-center py-4 px-2 rounded-2xl active:bg-gray-50 dark:active:bg-neutral-800"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: "#ef444415" }}
                  >
                    <Ionicons name="ban-outline" size={20} color="#ef4444" />
                  </View>
                  <Text className="ml-3 text-base text-gray-800 dark:text-gray-100 font-medium">
                    Blokiraj uporabnika
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
