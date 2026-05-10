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
  AppState,
  Alert,
  Image,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
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
import { useLanguage } from "../../lib/i18n";
import { design } from "../../lib/design";

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

type LastOwnMessageStatus = {
  messageId: string;
  label: string;
};

const CHAT_INPUT_LINE_HEIGHT = 22;
const CHAT_INPUT_VERTICAL_PADDING = 22;
const CHAT_INPUT_MIN_HEIGHT = CHAT_INPUT_LINE_HEIGHT + CHAT_INPUT_VERTICAL_PADDING;
const CHAT_INPUT_MAX_HEIGHT =
  CHAT_INPUT_LINE_HEIGHT * 4 + CHAT_INPUT_VERTICAL_PADDING;

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const prefillApplied = useRef(false);
  const matchClosedRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const channelReadyRef = useRef(false);
  const latestMessageRef = useRef<Message | null>(null);
  const meRef = useRef<Profile | null>(null);
  const { language, t } = useLanguage();

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

  const lastOwnMessageStatus = useMemo<LastOwnMessageStatus | null>(() => {
    if (!me) return null;

    const lastMine = [...messages]
      .reverse()
      .find((message) => message.sender_id === me.id);
    if (!lastMine) return null;

    if (lastMine.id.startsWith("temp-")) {
      return {
        messageId: lastMine.id,
        label: t("chat.sending"),
      };
    }

    if (!matchReadState) {
      return {
        messageId: lastMine.id,
        label: t("chat.sent"),
      };
    }

    const otherLastReadAt =
      matchReadState.user1_id === me.id
        ? matchReadState.user2_last_read_at
        : matchReadState.user1_last_read_at;

    return {
      messageId: lastMine.id,
      label:
        otherLastReadAt && Date.parse(otherLastReadAt) >= Date.parse(lastMine.created_at)
          ? t("chat.seen")
          : t("chat.sent"),
    };
  }, [matchReadState, me, messages, t]);

  const markChatSeen = useCallback(async () => {
    if (!matchId || matchClosedRef.current) return;
    const seenAt = new Date().toISOString();
    const { error } = await supabase.rpc("mark_chat_seen", {
      p_match_id: matchId,
    });
    if (error) return;

    const currentUser = meRef.current;
    if (!currentUser) return;

    setMatchReadState((prev) => {
      if (!prev) return prev;
      if (prev.user1_id === currentUser.id) {
        return { ...prev, user1_last_read_at: seenAt };
      }
      if (prev.user2_id === currentUser.id) {
        return { ...prev, user2_last_read_at: seenAt };
      }
      return prev;
    });
  }, [matchId]);

  function leaveRemovedBuddy(message = t("chat.removedDefault")) {
    if (matchClosedRef.current) return;
    matchClosedRef.current = true;
    setShowMenu(false);
    setOther(null);
    setMessages([]);
    setMatchReadState(null);
    Alert.alert(t("chat.removedTitle"), message, [
      {
        text: t("common.ok"),
        onPress: () => router.replace("/matches"),
      },
    ]);
  }

  async function handleMatchActionError(message: string) {
    if (!matchId) {
      Alert.alert(t("common.error"), message);
      return;
    }

    const { data: match, error } = await supabase
      .from("buddy_matches")
      .select("id")
      .eq("id", matchId)
      .maybeSingle();

    if (!error && !match) {
      leaveRemovedBuddy(t("chat.removedBody"));
      return;
    }

    Alert.alert(t("common.error"), message);
  }

  function removeBuddy() {
    if (!other || !matchId) return;

    setShowMenu(false);
    Alert.alert(
      t("chat.removeBuddy"),
      t("chat.removeBuddyConfirm", { name: other.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.rpc("remove_buddy", {
              p_match_id: matchId,
            });

            if (error) {
              await handleMatchActionError(error.message);
              return;
            }

            leaveRemovedBuddy(t("chat.removedBody"));
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
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
      meRef.current = myP as Profile;
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
          leaveRemovedBuddy(t("chat.removedBody"));
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

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void markChatSeen();
      }
    });

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
          leaveRemovedBuddy(t("chat.removedBody"));
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
      appStateSubscription.remove();
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

  function handleComposerTextChange(nextText: string) {
    setText(nextText);
  }

  const isAndroid = Platform.OS === "android";
  const composerBottomPadding = keyboardVisible ? 6 : Math.max(insets.bottom, 12);
  const scrollBottomPadding = composerHeight + 16;
  const composer = (
    <View
      className="bg-surface border-t border-line rounded-t-[32px] overflow-hidden"
      onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
      style={[
        isAndroid
          ? {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
            }
          : null,
      ]}
    >
      <View
        className="flex-row items-end gap-2 px-4 pt-3"
        style={{ paddingBottom: composerBottomPadding }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <TextInput
            value={text}
            onChangeText={handleComposerTextChange}
            onFocus={() => {
              requestAnimationFrame(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              });
            }}
            placeholder={t("chat.messagePlaceholder")}
            placeholderTextColor={design.colors.subtle}
            multiline
            scrollEnabled
            textAlignVertical="top"
            blurOnSubmit={false}
            className="bg-field border border-line rounded-[22px] text-ink"
            style={{
              width: "100%",
              minHeight: CHAT_INPUT_MIN_HEIGHT,
              maxHeight: CHAT_INPUT_MAX_HEIGHT,
              paddingHorizontal: 16,
              paddingTop: 11,
              paddingBottom: 11,
              fontSize: 16,
              lineHeight: CHAT_INPUT_LINE_HEIGHT,
            }}
          />
        </View>
        <Pressable
          onPress={send}
          className="w-11 h-11 bg-brand rounded-full items-center justify-center"
        >
          <EmojiIcon name="send" size={18} color={design.colors.white} />
        </Pressable>
      </View>
      {keyboardVisible ? (
        <View className="items-center px-4 pb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skrij tipkovnico"
            hitSlop={8}
            onPress={Keyboard.dismiss}
          >
            <Text style={{ color: design.colors.brand, fontWeight: "700" }}>
              Skrij tipkovnico
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-page"
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-16 pb-3 bg-surface border-b border-line">
        <Pressable onPress={() => router.back()}>
          <EmojiIcon name="chevron-back" size={24} color={design.colors.muted} />
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
              <View className="w-9 h-9 rounded-full bg-brand-light items-center justify-center">
                <Text className="font-bold text-brand-dark text-sm">
                  {other.name[0]}
                </Text>
              </View>
            )}
            <View className="ml-2.5">
              <Text className="font-bold text-base text-ink">
                {other.name}
              </Text>
              <Text className="text-xs text-muted">{other.faculty}</Text>
            </View>
          </Pressable>
        )}
        <Pressable
          onPress={() => setShowMenu(true)}
          className="w-9 h-9 rounded-full bg-field items-center justify-center"
        >
          <EmojiIcon name="ellipsis-vertical" size={18} color={design.colors.muted} />
        </Pressable>
      </View>

      <View className="flex-1">
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            padding: 16,
            gap: 10,
            paddingBottom: scrollBottomPadding,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((item) => {
            const mine = me && item.sender_id === me.id;
            const structured = parseStructuredChatContent(item.content);
            const statusLabel =
              mine && item.id === lastOwnMessageStatus?.messageId
                ? lastOwnMessageStatus.label
                : null;

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
                    className="rounded-[24px] p-4 border"
                    style={{
                      width: "100%",
                      backgroundColor: design.colors.warningBg,
                      borderColor: design.colors.warningBg,
                    }}
                  >
                    <View className="flex-row items-start">
                      <EmojiIcon
                        name="flash-outline"
                        size={18}
                        color={design.colors.warning}
                        style={{ marginTop: 2 }}
                      />
                      <View className="ml-2 flex-1">
                        <Text className="font-bold text-base text-ink">
                          {poke.prompt}
                        </Text>
                        <Text className="text-xs mt-1" style={{ color: design.colors.warning }}>
                          {t("chat.previousInvite")}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {statusLabel ? (
                    <Text className="text-[11px] text-muted mt-1 mr-2 self-end">
                      {statusLabel}
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
                    className={`rounded-[24px] px-4 py-3 ${
                      mine
                        ? "bg-brand"
                        : "bg-surface"
                    }`}
                    style={{ width: "100%" }}
                  >
                    <Text
                      className={`font-semibold ${
                        mine
                          ? "text-white"
                          : "text-ink"
                      }`}
                    >
                      {t("chat.bonInvite", { restaurant: invite.restaurant })}
                    </Text>
                    <Text
                      className={`mt-1 text-sm ${
                        mine
                          ? "text-white/80"
                          : "text-muted"
                      }`}
                    >
                      {formatScheduledDate(invite.scheduled_at, language)}
                    </Text>
                    {invite.note && (
                      <Text
                        className={`mt-1 text-sm ${
                          mine
                            ? "text-white/85"
                            : "text-soft"
                        }`}
                      >
                        {invite.note}
                      </Text>
                    )}
                  </View>
                  {statusLabel ? (
                    <Text className="text-[11px] text-muted mt-1 mr-2 self-end">
                      {statusLabel}
                    </Text>
                  ) : null}
                </View>
              );
            }

            return (
              <View key={item.id} className={`max-w-[78%] ${mine ? "self-end" : "self-start"}`}>
                <View
                  className={`px-4 py-3 rounded-[24px] ${
                    mine ? "bg-brand" : "bg-surface"
                  }`}
                >
                  <Text className={mine ? "text-white" : "text-ink"}>
                    {item.content}
                  </Text>
                </View>
                {statusLabel ? (
                  <Text className="text-[11px] text-muted mt-1 mr-2 self-end">
                    {statusLabel}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
        {composer}
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
            className="bg-surface rounded-t-[32px] px-5 pt-3 pb-10"
          >
            <View className="w-10 h-1 rounded-full bg-line self-center mb-5" />

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
                      className="bg-brand-light items-center justify-center"
                    >
                      <Text className="font-bold text-brand-dark">
                        {other.name[0]}
                      </Text>
                    </View>
                  )}
                  <View className="ml-3">
                    <Text className="font-bold text-ink text-base">
                      {other.name}
                    </Text>
                    <Text className="text-xs text-muted">
                      {other.faculty}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    setShowMenu(false);
                    router.push(`/profile-detail?id=${other.id}`);
                  }}
                  className="flex-row items-center py-4 px-2 rounded-[22px] active:bg-page"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${design.colors.brand}15` }}
                  >
                    <EmojiIcon name="person-outline" size={20} color={design.colors.brand} />
                  </View>
                  <Text className="ml-3 text-base text-soft font-medium">
                    {t("chat.viewProfile")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={removeBuddy}
                  className="flex-row items-center py-4 px-2 rounded-[22px] active:bg-page"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: design.colors.dangerBg }}
                  >
                    <EmojiIcon name="person-remove-outline" size={20} color={design.colors.danger} />
                  </View>
                  <Text className="ml-3 text-base text-soft font-medium">
                    {t("chat.removeBuddy")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowMenu(false);
                    Alert.alert(
                      t("common.block"),
                      t("chat.blockConfirm", { name: other.name }),
                      [
                        { text: t("common.cancel"), style: "cancel" },
                        {
                          text: t("common.block"),
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
                  className="flex-row items-center py-4 px-2 rounded-[22px] active:bg-page"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: design.colors.dangerBg }}
                  >
                    <EmojiIcon name="ban-outline" size={20} color={design.colors.danger} />
                  </View>
                  <Text className="ml-3 text-base text-soft font-medium">
                    {t("chat.blockUser")}
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
