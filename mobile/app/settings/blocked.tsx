import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
import { design } from "../../lib/design";
import { supabase, type Profile } from "../../lib/supabase";
import { useLanguage } from "../../lib/i18n";

type BlockedUser = { id: string; profile: Profile };

export default function BlockedUsers() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      (async () => {
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

        const { data: blocks } = await supabase
          .from("blocked_users")
          .select("id, blocked_id")
          .eq("blocker_id", me.id)
          .order("created_at", { ascending: false });

        const out: BlockedUser[] = [];
        for (const b of blocks ?? []) {
          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", b.blocked_id)
            .single();
          if (p) out.push({ id: b.id, profile: p as Profile });
        }
        setBlocked(out);
        setLoading(false);
      })();
    }, [])
  );

  async function unblock(item: BlockedUser) {
    Alert.alert(t("profileDetail.unblockTitle"), t("profileDetail.unblockConfirm", { name: item.profile.name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.unblock"),
        onPress: async () => {
          await supabase.from("blocked_users").delete().eq("id", item.id);
          setBlocked((prev) => prev.filter((b) => b.id !== item.id));
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-page">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <EmojiIcon name="chevron-back" size={28} color={design.colors.muted} />
        </Pressable>
        <Text className="text-lg font-bold text-ink ml-3">
          {t("settings.blockedTitle")}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={design.colors.brand} className="mt-10" />
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <EmojiIcon name="shield-checkmark-outline" size={48} color={design.colors.muted} />
              <Text className="text-muted text-lg mt-4">
                {t("settings.noBlocked")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-surface rounded-[24px] p-4 flex-row items-center border border-line">
              <Pressable
                onPress={() =>
                  router.push(`/profile-detail?id=${item.profile.id}`)
                }
              >
                {item.profile.photos[0] ? (
                  <Image
                    source={{ uri: item.profile.photos[0] }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                  />
                ) : (
                  <View
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    className="bg-brand-light items-center justify-center"
                  >
                    <Text className="font-bold text-brand-dark">
                      {item.profile.name[0]}
                    </Text>
                  </View>
                )}
              </Pressable>
              <View className="flex-1 ml-3">
                <Text className="font-bold text-ink">
                  {item.profile.name}
                </Text>
                <Text className="text-xs text-muted">
                  {item.profile.faculty}
                </Text>
              </View>
              <Pressable
                onPress={() => unblock(item)}
                className="bg-field rounded-full px-4 py-2"
              >
                <Text className="text-sm font-semibold text-soft">
                  {t("common.unblock")}
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
