import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  Alert,
  Share,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getChatMessagePreview } from "../../lib/chatContent";
import { supabase, type Message, type Profile } from "../../lib/supabase";

const INVITE_BASE_URL = "https://bonibuddy.app/invite";
const DAYS = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

type LastMessage = {
  preview: string;
  time: string;
  createdAt: string;
  mine: boolean;
};

type Item = {
  matchId: string;
  other: Profile;
  last?: LastMessage;
  lastActivityAt: string;
  hasUnread: boolean;
  streak: number;
};

type BuddyMatchRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  user1_last_read_at: string | null;
  user2_last_read_at: string | null;
};

const subtleCardShadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.03,
  shadowRadius: 4,
  elevation: 0,
} as const;

function sortItems(items: Item[]) {
  return [...items].sort((a, b) => {
    const byActivity =
      Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt);
    if (byActivity !== 0) return byActivity;
    return a.matchId.localeCompare(b.matchId);
  });
}

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

function isReadReceiptColumnError(error: { code?: string; message?: string; details?: string }) {
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    error.code === "42703" ||
    (error.code === "PGRST204" && text.includes("last_read_at")) ||
    text.includes("user1_last_read_at") ||
    text.includes("user2_last_read_at")
  );
}

export default function Matches() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentProfileIdRef = useRef<string | null>(null);
  const itemsRef = useRef<Item[]>([]);

  const loadMatches = useCallback(async () => {
    setLoadError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: me, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (profileError) throw profileError;
      if (!me) return;
      currentProfileIdRef.current = me.id;

      const matchQuery = supabase
        .from("buddy_matches")
        .select(
          "id, user1_id, user2_id, created_at, user1_last_read_at, user2_last_read_at"
        )
        .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
        .order("created_at", { ascending: false });
      let { data: matches, error: matchesError } = await matchQuery;

      if (matchesError && isReadReceiptColumnError(matchesError)) {
        console.warn("Read receipt columns are unavailable; loading buddies without unread state.");
        const fallback = await supabase
          .from("buddy_matches")
          .select("id, user1_id, user2_id, created_at")
          .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
          .order("created_at", { ascending: false });
        matches = (fallback.data ?? []).map((match) => ({
          ...match,
          user1_last_read_at: null,
          user2_last_read_at: null,
        }));
        matchesError = fallback.error;
      }

      if (matchesError) throw matchesError;

      const out: Array<Item | null> = await Promise.all(
        ((matches ?? []) as BuddyMatchRow[]).map(async (match) => {
          const otherId =
            match.user1_id === me.id ? match.user2_id : match.user1_id;
          const lastReadAt =
            match.user1_id === me.id
              ? match.user1_last_read_at
              : match.user2_last_read_at;

          let unreadQuery = supabase
            .from("chat_messages")
            .select("id")
            .eq("match_id", match.id)
            .neq("sender_id", me.id)
            .order("created_at", { ascending: false })
            .limit(1);
          if (lastReadAt) {
            unreadQuery = unreadQuery.gt("created_at", lastReadAt);
          }

          const [
            { data: other, error: otherError },
            { data: msg, error: msgError },
            { data: unreadMessages, error: unreadError },
            { data: streakData, error: streakError },
          ] = await Promise.all([
            supabase.from("profiles").select("*").eq("id", otherId).single(),
            supabase
              .from("chat_messages")
              .select("content, sender_id, created_at")
              .eq("match_id", match.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            unreadQuery,
            supabase.rpc("buddy_streak", {
              p_match_id: match.id,
            }),
          ]);

          if (otherError) {
            console.warn("Failed to load buddy profile", otherError.message);
            return null;
          }
          if (msgError) {
            console.warn("Failed to load last chat message", msgError.message);
          }
          if (unreadError) {
            console.warn("Failed to load unread chat state", unreadError.message);
          }
          if (streakError) {
            console.warn("Failed to load buddy streak", streakError.message);
          }

          const hasUnread = unreadError ? false : (unreadMessages ?? []).length > 0;

          if (!other) return null;

          let last: LastMessage | undefined;
          if (msg && !msgError) {
            const { preview } = getChatMessagePreview(msg.content ?? "");
            last = {
              preview,
              time: formatListTime(msg.created_at),
              createdAt: msg.created_at,
              mine: msg.sender_id === me.id,
            };
          }

          const streak = typeof streakData === "number" && !streakError ? streakData : 0;

          return {
            matchId: match.id,
            other: other as Profile,
            last,
            lastActivityAt: last?.createdAt ?? match.created_at,
            hasUnread,
            streak,
          } satisfies Item;
        })
      );

      const nextItems = sortItems(out.filter((item): item is Item => item !== null));
      itemsRef.current = nextItems;
      setItems(nextItems);
    } catch (error) {
      console.warn("Failed to load buddies", error);
      itemsRef.current = [];
      setItems([]);
      setLoadError("Pogovorov trenutno ni mogoče naložiti.");
    } finally {
      setLoaded(true);
    }
  }, []);

  const applyRealtimeMessage = useCallback((message: Message) => {
    const currentProfileId = currentProfileIdRef.current;
    if (!currentProfileId) return false;

    const found = itemsRef.current.some((item) => item.matchId === message.match_id);
    if (!found) return false;

    const { preview } = getChatMessagePreview(message.content ?? "");

    setItems((prev) => {
      const next = prev.map((item) => {
        if (item.matchId !== message.match_id) return item;

        return {
          ...item,
          last: {
            preview,
            time: formatListTime(message.created_at),
            createdAt: message.created_at,
            mine: message.sender_id === currentProfileId,
          },
          lastActivityAt: message.created_at,
          hasUnread:
            message.sender_id === currentProfileId ? item.hasUnread : true,
        };
      });

      const sorted = sortItems(next);
      itemsRef.current = sorted;
      return sorted;
    });

    return true;
  }, []);

  const scheduleRefresh = useCallback(
    (delay = 200) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
        void loadMatches();
      }, delay);
    },
    [loadMatches]
  );

  useFocusEffect(
    useCallback(() => {
      void loadMatches();

      const channel = supabase
        .channel("matches-list")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
          },
          (payload) => {
            const updated = applyRealtimeMessage(payload.new as Message);
            if (!updated) {
              scheduleRefresh(0);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "buddy_matches",
          },
          () => {
            scheduleRefresh();
          }
        )
        .subscribe();

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
        supabase.removeChannel(channel);
      };
    }, [applyRealtimeMessage, loadMatches, scheduleRefresh])
  );

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
      {loaded && loadError ? (
        <View
          className="items-center justify-center px-6"
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <Ionicons name="warning-outline" size={52} color="#9CA3AF" />
          <Text className="text-gray-900 dark:text-white text-xl font-bold mt-5 text-center">
            {loadError}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2 text-center">
            Poskusi znova čez trenutek.
          </Text>
        </View>
      ) : null}
      {loaded && !loadError && items.length === 0 ? (
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
      <FlatList
        data={items}
        keyExtractor={(item) => item.matchId}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        renderItem={({ item }) => {
          const cardClassName = item.hasUnread
            ? "rounded-3xl px-4 py-3.5 flex-row items-center bg-white border border-blue-200 dark:bg-neutral-900 dark:border-blue-500/40 active:bg-blue-50 dark:active:bg-blue-500/10"
            : "rounded-3xl px-4 py-3.5 flex-row items-center bg-white dark:bg-neutral-900 active:bg-gray-50 dark:active:bg-neutral-800";

          return (
            <Pressable
              onPress={() => handleRowPress(item)}
              style={subtleCardShadow}
              className={cardClassName}
            >
              <Pressable onPress={() => handleAvatarPress(item)}>
                {item.other.photos[0] ? (
                  <Image
                    source={{ uri: item.other.photos[0] }}
                    style={{ width: 56, height: 56, borderRadius: 28 }}
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
                    className={`flex-1 text-base text-gray-900 dark:text-white ${
                      item.hasUnread ? "font-extrabold" : "font-bold"
                    }`}
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
                    className={`flex-1 text-sm ${
                      item.hasUnread
                        ? "text-gray-800 dark:text-gray-200 font-semibold"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                    numberOfLines={1}
                  >
                    {item.last
                      ? `${item.last.mine ? "Ti: " : ""}${item.last.preview}`
                      : "Pozdravita se 👋"}
                  </Text>
                  {item.hasUnread ? (
                    <View className="w-2.5 h-2.5 rounded-full bg-brand ml-3 shrink-0" />
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
