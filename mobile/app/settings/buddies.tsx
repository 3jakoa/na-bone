import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  Alert,
  Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
import { supabase, type Profile } from "../../lib/supabase";
import { useLanguage } from "../../lib/i18n";
import { design } from "../../lib/design";

type Buddy = { matchId: string; profile: Profile };

export default function Buddies() {
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBuddy, setActionBuddy] = useState<Buddy | null>(null);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
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
    setMeId(me.id);

    const { data: matches } = await supabase
      .from("buddy_matches")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
      .order("created_at", { ascending: false });

    const out: Buddy[] = [];
    for (const m of matches ?? []) {
      const otherId = m.user1_id === me.id ? m.user2_id : m.user1_id;
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherId)
        .single();
      if (p) out.push({ matchId: m.id, profile: p as Profile });
    }
    setBuddies(out);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function unmatchBuddy(buddy: Buddy) {
    const { error } = await supabase.rpc("remove_buddy", {
      p_match_id: buddy.matchId,
    });

    if (error) {
      Alert.alert(t("common.error"), error.message);
      return false;
    }

    return true;
  }

  function removeBuddy(buddy: Buddy) {
    setActionBuddy(null);
    Alert.alert(
      t("settings.removeBuddyTitle"),
      t("settings.removeBuddyConfirm", { name: buddy.profile.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            const removed = await unmatchBuddy(buddy);
            if (!removed) return;
            setBuddies((prev) => prev.filter((b) => b.matchId !== buddy.matchId));
          },
        },
      ]
    );
  }

  function blockUser(buddy: Buddy) {
    setActionBuddy(null);
    Alert.alert(
      t("common.block"),
      t("chat.blockConfirm", { name: buddy.profile.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.block"),
          style: "destructive",
          onPress: async () => {
            if (!meId) return;
            const { error: blockError } = await supabase.from("blocked_users").insert({
              blocker_id: meId,
              blocked_id: buddy.profile.id,
            });
            if (blockError) {
              Alert.alert(t("common.error"), blockError.message);
              return;
            }

            const removed = await unmatchBuddy(buddy);
            if (removed) {
              setBuddies((prev) => prev.filter((b) => b.matchId !== buddy.matchId));
              return;
            }

            await load();
          },
        },
      ]
    );
  }

  return (
    <View className="flex-1 bg-page">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <EmojiIcon name="chevron-back" size={28} color={design.colors.muted} />
        </Pressable>
        <Text className="text-lg font-bold text-ink ml-3">
          {t("settings.buddiesTitle")}
        </Text>
        <Text className="text-muted text-sm ml-2">({buddies.length})</Text>
      </View>

      <FlatList
        data={buddies}
        keyExtractor={(b) => b.matchId}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        ListEmptyComponent={
          loading ? null : (
            <View className="items-center mt-16">
              <EmojiIcon name="people-outline" size={48} color={design.colors.muted} />
              <Text className="text-muted text-lg mt-4">
                {t("settings.noBuddies")}
              </Text>
              <Text className="text-subtle text-sm mt-1">
                {t("settings.swipeToFind")}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/matches/${item.matchId}`)}
            className="bg-surface rounded-[24px] p-4 flex-row items-center border border-line"
          >
            <Pressable
              onPress={() =>
                router.push(`/profile-detail?id=${item.profile.id}`)
              }
            >
              {item.profile.photos[0] ? (
                <Image
                  source={{ uri: item.profile.photos[0] }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              ) : (
                <View
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                  className="bg-brand-light items-center justify-center"
                >
                  <Text className="font-bold text-brand-dark text-lg">
                    {item.profile.name[0]}
                  </Text>
                </View>
              )}
            </Pressable>

            <View className="flex-1 ml-3">
              <Text className="font-bold text-ink">
                {item.profile.name}, {item.profile.age}
              </Text>
              <Text className="text-xs text-muted">
                {item.profile.faculty}
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => router.push(`/matches/${item.matchId}`)}
                className="w-10 h-10 rounded-full bg-brand-light items-center justify-center"
              >
                <EmojiIcon name="chatbubble" size={18} color={design.colors.brand} />
              </Pressable>
              <Pressable
                onPress={() => setActionBuddy(item)}
                className="w-10 h-10 rounded-full bg-field items-center justify-center"
              >
                <EmojiIcon
                  name="ellipsis-horizontal"
                  size={18}
                  color={design.colors.muted}
                />
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      {/* Custom action modal */}
      <Modal
        visible={!!actionBuddy}
        transparent
        animationType="fade"
        onRequestClose={() => setActionBuddy(null)}
      >
        <Pressable
          onPress={() => setActionBuddy(null)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={() => {}}
            className="bg-surface rounded-t-[32px] px-5 pt-3 pb-10"
          >
            {/* Handle bar */}
            <View className="w-10 h-1 rounded-full bg-line self-center mb-5" />

            {actionBuddy && (
              <>
                {/* Header */}
                <View className="flex-row items-center mb-5">
                  {actionBuddy.profile.photos[0] ? (
                    <Image
                      source={{ uri: actionBuddy.profile.photos[0] }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                    />
                  ) : (
                    <View
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                      className="bg-brand-light items-center justify-center"
                    >
                      <Text className="font-bold text-brand-dark">
                        {actionBuddy.profile.name[0]}
                      </Text>
                    </View>
                  )}
                  <View className="ml-3">
                    <Text className="font-bold text-ink text-base">
                      {actionBuddy.profile.name}
                    </Text>
                    <Text className="text-xs text-muted">
                      {actionBuddy.profile.faculty}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <ActionRow
                  icon="chatbubble-outline"
                  label={t("settings.sendMessage")}
                  color={design.colors.brand}
                  onPress={() => {
                    setActionBuddy(null);
                    router.push(`/matches/${actionBuddy.matchId}`);
                  }}
                />
                <ActionRow
                  icon="person-outline"
                  label={t("settings.viewProfile")}
                  color={design.colors.brand}
                  onPress={() => {
                    setActionBuddy(null);
                    router.push(
                      `/profile-detail?id=${actionBuddy.profile.id}`
                    );
                  }}
                />
                <ActionRow
                  icon="person-remove-outline"
                  label={t("settings.removeBuddyTitle")}
                  color={design.colors.danger}
                  onPress={() => removeBuddy(actionBuddy)}
                />
                <ActionRow
                  icon="ban-outline"
                  label={t("settings.blockUser")}
                  color={design.colors.danger}
                  onPress={() => blockUser(actionBuddy)}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 px-2 rounded-[22px] active:bg-page"
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: color + "15" }}
      >
        <EmojiIcon name={icon as any} size={20} color={color} />
      </View>
      <Text className="ml-3 text-base text-soft font-medium">{label}</Text>
    </Pressable>
  );
}
