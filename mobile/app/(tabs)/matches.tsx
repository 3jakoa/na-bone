import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  Alert,
  Share,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getChatMessagePreview } from "../../lib/chatContent";
import { supabase, type Profile } from "../../lib/supabase";
import {
  fetchBuddyChatPreviews,
  getCachedBuddyChatPreviews,
  invalidateBuddyChatPreviews,
  isBuddyChatPreviewCacheFresh,
  subscribeBuddyChatPreviewUpdates,
  type BuddyChatPreviewMessageUpdate,
  type BuddyChatPreview,
} from "../../lib/buddyChatPreviews";

const INVITE_BASE_URL = "https://bonibuddy.app/invite";
const DAYS = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];
const DEBUG_BUDDY_TIMING = __DEV__;

type LastMessage = {
  preview: string;
  time: string;
  createdAt: string;
  mine: boolean;
};

type Item = {
  matchId: string;
  other: Pick<Profile, "id" | "user_id" | "name" | "faculty" | "photos">;
  last?: LastMessage;
  lastActivityAt: string;
  streak: number;
  unreadCount: number;
};

const subtleCardShadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 1,
} as const;

function formatListTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round(
    (today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  }
  if (diffDays === 1) return "Včeraj";
  if (diffDays < 7) return DAYS[date.getDay()];
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

function mapPreviewToItem(row: BuddyChatPreview): Item {
  let last: LastMessage | undefined;
  if (row.latest_message_content && row.latest_message_created_at) {
    const { preview } = getChatMessagePreview(row.latest_message_content);
    last = {
      preview,
      time: formatListTime(row.latest_message_created_at),
      createdAt: row.latest_message_created_at,
      mine: row.latest_message_mine === true,
    };
  }

  return {
    matchId: row.match_id,
    other: {
      id: row.other_profile_id,
      user_id: row.other_user_id,
      name: row.other_name,
      faculty: row.other_faculty,
      photos: row.other_photos ?? [],
    },
    last,
    lastActivityAt: row.last_activity_at,
    streak: row.streak ?? 0,
    unreadCount: row.unread_count ?? 0,
  };
}

function logBuddiesTiming(label: string, startedAt: number) {
  if (!DEBUG_BUDDY_TIMING) return;
  console.log(`[Buddies] ${label} ${Date.now() - startedAt}ms`);
}

function applyMessageUpdateToItems(
  items: Item[],
  update: BuddyChatPreviewMessageUpdate
) {
  let changed = false;
  const next = items.map((item) => {
    if (item.matchId !== update.matchId) return item;
    if (Date.parse(update.createdAt) < Date.parse(item.lastActivityAt)) {
      return item;
    }

    changed = true;
    return {
      ...item,
      last: {
        preview: getChatMessagePreview(update.content).preview,
        time: formatListTime(update.createdAt),
        createdAt: update.createdAt,
        mine: update.mine,
      },
      lastActivityAt: update.createdAt,
      unreadCount: update.mine ? item.unreadCount : item.unreadCount + 1,
    };
  });

  if (!changed) return items;

  next.sort((a, b) => {
    const byActivity =
      Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt);
    if (byActivity !== 0) return byActivity;
    return a.matchId.localeCompare(b.matchId);
  });

  return next;
}

export default function Matches() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const refreshSeq = useRef(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const applyCachedRows = useCallback(() => {
    const startedAt = Date.now();
    const cached = getCachedBuddyChatPreviews();
    if (!cached) return false;

    setItems(cached.rows.map(mapPreviewToItem));
    setLoaded(true);
    logBuddiesTiming(
      `rendered ${cached.rows.length} cached previews after avatars were left async`,
      startedAt
    );
    return true;
  }, []);

  const refreshMatches = useCallback(
    async ({ force = false, reason = "focus" } = {}) => {
      const seq = ++refreshSeq.current;
      const startedAt = Date.now();

      try {
        const rows = await fetchBuddyChatPreviews({ force, reason });
        if (seq !== refreshSeq.current) return;

        logBuddiesTiming(
          `mapped matches/profiles/latest messages/unread counts/streaks for ${rows.length} rows`,
          startedAt
        );
        setItems(rows.map(mapPreviewToItem));
        setLoaded(true);
      } catch (error: any) {
        if (seq !== refreshSeq.current) return;
        if (DEBUG_BUDDY_TIMING) {
          console.warn(
            "[Buddies] failed to load chat previews",
            error?.message ?? error
          );
        }
        setLoaded(true);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      const hadCache = applyCachedRows();
      if (!hadCache || !isBuddyChatPreviewCacheFresh()) {
        void refreshMatches({
          force: false,
          reason: hadCache ? "stale-focus-refresh" : "first-focus",
        });
      }
    }, [applyCachedRows, refreshMatches])
  );

  useEffect(() => {
    const startedAt = Date.now();
    const refreshFromRealtime = (reason: string) => {
      invalidateBuddyChatPreviews();
      void refreshMatches({ force: true, reason });
    };

    const channel = supabase
      .channel("buddy-chat-previews")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => refreshFromRealtime("realtime-message")
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        () => refreshFromRealtime("realtime-message-read")
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "buddy_matches" },
        () => refreshFromRealtime("realtime-match-insert")
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "buddy_matches" },
        () => refreshFromRealtime("realtime-match-delete")
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          logBuddiesTiming("realtime subscriptions ready", startedAt);
        }
      });

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [refreshMatches]);

  useEffect(() => {
    return subscribeBuddyChatPreviewUpdates((update) => {
      setItems((prev) => applyMessageUpdateToItems(prev, update));
    });
  }, []);

  async function inviteBuddy() {
    setInviteLoading(true);
    const { data, error } = await supabase.rpc("create_buddy_invite");
    setInviteLoading(false);

    if (error || !data) {
      return Alert.alert(
        "Napaka",
        error?.message ?? "Povabila trenutno ni mogoče ustvariti."
      );
    }

    const inviteUrl = `${INVITE_BASE_URL}/${data as string}`;
    await Share.share({
      message: `Dodaj me kot buddyja na Boni Buddy: ${inviteUrl}`,
    });
  }

  function handleRowPress(item: Item) {
    router.push(`/matches/${item.matchId}`);
  }

  function handleAvatarPress(item: Item) {
    router.push(`/profile-detail?id=${item.other.id}`);
  }

  const header = (
    <View className="px-6 mb-4 flex-row items-center justify-between">
      <View>
        {loaded && items.length > 0 ? (
          <Text className="text-sm text-gray-400 dark:text-gray-500">
            {items.length} {items.length === 1 ? "pogovor" : "pogovorov"}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={inviteBuddy}
        disabled={inviteLoading}
        className="bg-brand-light dark:bg-brand/20 rounded-full px-4 py-2 flex-row items-center"
      >
        <Ionicons name="person-add-outline" size={16} color="#00A6F6" />
        <Text className="text-brand font-bold text-sm ml-1.5">
          {inviteLoading ? "..." : "Dodaj buddyja"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950 pt-16">
      {header}
      {loaded && items.length === 0 ? (
        <View
          pointerEvents="none"
          className="items-center justify-center px-6"
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <Image
            source={require("../../assets/logo.png")}
            style={{ width: 64, height: 64, borderRadius: 32 }}
            resizeMode="cover"
          />
          <Text className="text-gray-900 dark:text-white text-xl font-bold mt-5">
            Še ni matchev
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2 text-center">
            Swipaj ali dodaj buddyja z linkom
          </Text>
        </View>
      ) : null}
      {!loaded && items.length === 0 ? (
        <View className="px-6 pt-10 items-center">
          <ActivityIndicator size="small" color="#00A6F6" />
        </View>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.matchId}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        renderItem={({ item }) => {
          return (
            <Pressable
              onPress={() => handleRowPress(item)}
              style={subtleCardShadow}
              className="rounded-3xl px-4 py-3.5 flex-row items-center bg-white dark:bg-neutral-900 active:bg-gray-50 dark:active:bg-neutral-800"
            >
              <Pressable onPress={() => handleAvatarPress(item)}>
                {item.other.photos[0] ? (
                  <Image
                    source={{ uri: item.other.photos[0] }}
                    style={{ width: 56, height: 56, borderRadius: 28 }}
                    onLoadEnd={() => {
                      if (DEBUG_BUDDY_TIMING) {
                        console.log(
                          `[Buddies] avatar loaded for ${item.matchId}; list rendering was not blocked`
                        );
                      }
                    }}
                  />
                ) : (
                  <View className="w-14 h-14 rounded-full bg-brand-light dark:bg-neutral-800 items-center justify-center">
                    <Text className="font-bold text-lg text-brand-dark dark:text-brand">
                      {item.other.name[0]}
                    </Text>
                  </View>
                )}
              </Pressable>

              <View className="flex-1 ml-3 min-w-0">
                <View className="flex-row items-center">
                  <Text
                    className="flex-1 font-bold text-base text-gray-900 dark:text-white"
                    numberOfLines={1}
                  >
                    {item.other.name}
                  </Text>
                  {item.streak > 0 ? (
                    <View
                      className="flex-row items-center bg-orange-50 dark:bg-orange-500/20 rounded-full px-2 py-0.5 ml-2 shrink-0"
                      style={{ gap: 2 }}
                    >
                      <Ionicons name="flame" size={11} color="#F97316" />
                      <Text className="text-xs font-bold text-orange-500">
                        {item.streak}
                      </Text>
                    </View>
                  ) : null}
                  {item.last ? (
                    <Text className="text-xs text-gray-400 dark:text-gray-500 ml-2 shrink-0">
                      {item.last.time}
                    </Text>
                  ) : null}
                </View>

                <View className="flex-row items-center mt-0.5">
                  <Text
                    className="flex-1 text-sm text-gray-500 dark:text-gray-400"
                    numberOfLines={1}
                  >
                    {item.last
                      ? `${item.last.mine ? "Ti: " : ""}${item.last.preview}`
                      : "Pozdravita se 👋"}
                  </Text>
                  {item.unreadCount > 0 ? (
                    <View className="ml-2 min-w-5 h-5 px-1.5 rounded-full bg-brand items-center justify-center">
                      <Text className="text-[11px] font-bold text-white">
                        {item.unreadCount > 9 ? "9+" : item.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
