import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logProductEvent } from "../../lib/productEvents";
import { formatScheduledDate } from "../../lib/formatDate";
import { parseStructuredChatContent } from "../../lib/chatContent";
import {
  supabase,
  type BuddyMatch,
  type Message,
  type Profile,
} from "../../lib/supabase";

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
  const [matchReadState, setMatchReadState] = useState<BuddyMatch | null>(null);
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
  const meRef = useRef<Profile | null>(null);

  useEffect(() => {
    if (!matchId) return;
    void logProductEvent("thread_opened", { matchId });
  }, [matchId]);

  useEffect(() => {
    latestMessageRef.current = messages.length > 0 ? messages[messages.length - 1] : null;
  }, [messages]);

  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const lastSeenMessageId = useMemo(() => {
    if (!me || !matchReadState) return null;

    const otherLastReadAt =
      matchReadState.user1_id === me.id
        ? matchReadState.user2_last_read_at
        : matchReadState.user1_last_read_at;
    if (!otherLastReadAt) return null;

    const lastMine = [...messages]
      .reverse()
      .find((message) => message.sender_id === me.id && !message.id.startsWith("temp-"));
    if (!lastMine) return null;

    return Date.parse(otherLastReadAt) >= Date.parse(lastMine.created_at)
      ? lastMine.id
      : null;
  }, [matchReadState, me, messages]);

  const markChatSeen = useCallback(async () => {
    if (!matchId || matchClosedRef.current) return;
    await supabase.rpc("mark_chat_seen", { p_match_id: matchId });
  }, [matchId]);

  function leaveRemovedBuddy(message = "Ta buddy ni več na voljo.") {
    if (matchClosedRef.current) return;
    matchClosedRef.current = true;
    setShowMenu(false);
    setOther(null);
    setMessages([]);
    setMatchReadState(null);
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
        setMatchReadState(m as BuddyMatch);
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
      void markChatSeen();
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
          if (meRef.current && newMsg.sender_id !== meRef.current.id) {
            void markChatSeen();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "buddy_matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          setMatchReadState(payload.new as BuddyMatch);
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
        const nextMessages = data as Message[];
        setMessages((prev) => mergeMessages(prev, nextMessages));
        if (
          meRef.current &&
          nextMessages.some((message) => message.sender_id !== meRef.current?.id)
        ) {
          void markChatSeen();
        }
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
  }, [markChatSeen, matchId]);

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
            const structured = parseStructuredChatContent(item.content);
            const seen = mine && item.id === lastSeenMessageId;

            if (structured?.type === "poke") {
              const poke = structured;
              return (
                <View
                  key={item.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    width: "85%",
                  }}
                >
                  <View
                    className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-3xl p-4"
                    style={{ width: "100%" }}
                  >
                    <View className="flex-row items-start">
                      <Ionicons
                        name="flash-outline"
                        size={18}
                        color="#D97706"
                        style={{ marginTop: 2 }}
                      />
                      <View className="ml-2 flex-1">
                        <Text className="font-bold text-base text-gray-900 dark:text-white">
                          {poke.prompt}
                        </Text>
                        <Text className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                          Prejšnje povabilo
                        </Text>
                      </View>
                    </View>
                  </View>
                  {seen ? (
                    <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 mr-2 self-end">
                      Videno
                    </Text>
                  ) : null}
                </View>
              );
            }

            const invite = structured?.type === "bone_invite" ? structured : null;

            if (invite) {
              return (
                <View
                  key={item.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    width: "85%",
                  }}
                >
                  <View
                    className={`rounded-3xl px-4 py-3 ${
                      mine
                        ? "bg-brand"
                        : "bg-white dark:bg-neutral-900 shadow-sm"
                    }`}
                    style={{ width: "100%" }}
                  >
                    <Text
                      className={`font-semibold ${
                        mine
                          ? "text-white"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      Povabilo na bon: {invite.restaurant}
                    </Text>
                    <Text
                      className={`mt-1 text-sm ${
                        mine
                          ? "text-white/80"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {formatScheduledDate(invite.scheduled_at)}
                    </Text>
                    {invite.note && (
                      <Text
                        className={`mt-1 text-sm ${
                          mine
                            ? "text-white/85"
                            : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {invite.note}
                      </Text>
                    )}
                  </View>
                  {seen ? (
                    <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 mr-2 self-end">
                      Videno
                    </Text>
                  ) : null}
                </View>
              );
            }

            return (
              <View key={item.id} className={`max-w-[78%] ${mine ? "self-end" : "self-start"}`}>
                <View
                  className={`px-4 py-3 rounded-3xl ${
                    mine ? "bg-brand" : "bg-white dark:bg-neutral-900 shadow-sm"
                  }`}
                >
                  <Text className={mine ? "text-white" : "text-gray-900 dark:text-gray-100"}>
                    {item.content}
                  </Text>
                </View>
                {seen ? (
                  <Text className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 mr-2 self-end">
                    Videno
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
        <View className="bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800">
          <View
            className="flex-row items-center gap-2 px-4 pt-3"
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
