import { useCallback, useState } from "react";
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
import { supabase, type Profile } from "../../lib/supabase";

const INVITE_BASE_URL = "https://na-bone-vggw.vercel.app/invite";
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
  streak: number;
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

export default function Matches() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadMatches = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: me } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!me) return;

    const { data: matches } = await supabase
      .from("buddy_matches")
      .select("id, user1_id, user2_id, created_at")
      .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
      .order("created_at", { ascending: false });

    const out: Item[] = [];
    for (const match of matches ?? []) {
      const otherId =
        match.user1_id === me.id ? match.user2_id : match.user1_id;
      const { data: other } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherId)
        .single();
      const { data: msg } = await supabase
        .from("chat_messages")
        .select("content, sender_id, created_at")
        .eq("match_id", match.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!other) continue;

      let last: LastMessage | undefined;
      if (msg) {
        const { preview } = getChatMessagePreview(msg.content ?? "");
        last = {
          preview,
          time: formatListTime(msg.created_at),
          createdAt: msg.created_at,
          mine: msg.sender_id === me.id,
        };
      }

      const { data: streakData } = await supabase.rpc("buddy_streak", {
        p_match_id: match.id,
      });
      const streak = typeof streakData === "number" ? streakData : 0;

      out.push({
        matchId: match.id,
        other: other as Profile,
        last,
        lastActivityAt: last?.createdAt ?? match.created_at,
        streak,
      });
    }

    out.sort((a, b) => {
      const byActivity =
        Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt);
      if (byActivity !== 0) return byActivity;
      return a.matchId.localeCompare(b.matchId);
    });

    setItems(out);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMatches();
    }, [loadMatches])
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
      url: inviteUrl,
    });
  }

  function handleRowPress(item: Item) {
    router.push(`/matches/${item.matchId}`);
  }

  function handleAvatarPress(item: Item) {
    router.push(`/profile-detail?id=${item.other.id}`);
  }

  const header = (
    <View className="px-6 mb-4 flex-row items-start justify-between">
      <View>
        <Text className="text-3xl font-bold text-gray-900 dark:text-white">
          Buddies
        </Text>
        {loaded && items.length > 0 ? (
          <Text className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
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
          {inviteLoading ? "..." : "Povabi"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950 pt-16">
      {header}
      <FlatList
        data={items}
        keyExtractor={(item) => item.matchId}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        ListEmptyComponent={
          loaded ? (
            <View className="items-center mt-16">
              <Ionicons name="chatbubbles-outline" size={48} color="#888" />
              <Text className="text-gray-400 dark:text-gray-500 text-lg mt-4">
                Še ni matchev
              </Text>
              <Text className="text-gray-300 dark:text-gray-600 text-sm mt-1">
                Swipaj ali povabi frenda z linkom
              </Text>
            </View>
          ) : null
        }
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
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
