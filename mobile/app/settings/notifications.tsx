import { useEffect, useState } from "react";
import { View, Text, Pressable, Switch, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
import { design } from "../../lib/design";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../lib/i18n";

type Prefs = {
  notif_bones: boolean;
  notif_matches: boolean;
  notif_messages: boolean;
};

export default function Notifications() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [meUserId, setMeUserId] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setMeUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("notif_bones, notif_matches, notif_messages")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setPrefs({
          notif_bones: data.notif_bones ?? true,
          notif_matches: data.notif_matches ?? true,
          notif_messages: data.notif_messages ?? true,
        });
      } else {
        setPrefs({
          notif_bones: true,
          notif_matches: true,
          notif_messages: true,
        });
      }
    })();
  }, []);

  async function update<K extends keyof Prefs>(key: K, value: boolean) {
    if (!prefs || !meUserId) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await supabase
      .from("profiles")
      .update({ [key]: value })
      .eq("user_id", meUserId);
  }

  return (
    <View className="flex-1 bg-page">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <EmojiIcon name="chevron-back" size={28} color={design.colors.muted} />
        </Pressable>
        <Text className="text-lg font-bold text-ink ml-3">{t("settings.notificationsTitle")}</Text>
      </View>

      {!prefs ? (
        <ActivityIndicator color={design.colors.brand} className="mt-10" />
      ) : (
        <>
          <View className="bg-surface mx-4 rounded-[24px] overflow-hidden border border-line">
            <ToggleRow
              icon="restaurant-outline"
              label={t("settings.newBoni")}
              description={t("settings.newBoniDesc")}
              value={prefs.notif_bones}
              onToggle={(v) => update("notif_bones", v)}
            />
            <Sep />
            <ToggleRow
              icon="heart-outline"
              label={t("settings.newMatches")}
              description={t("settings.newMatchesDesc")}
              value={prefs.notif_matches}
              onToggle={(v) => update("notif_matches", v)}
            />
            <Sep />
            <ToggleRow
              icon="chatbubble-outline"
              label={t("settings.messages")}
              description={t("settings.messagesDesc")}
              value={prefs.notif_messages}
              onToggle={(v) => update("notif_messages", v)}
            />
          </View>

          <Text className="text-xs text-muted text-center mt-4 px-8">
            {t("settings.notificationsHint")}
          </Text>
        </>
      )}
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onToggle,
}: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center px-5 py-4">
      <EmojiIcon name={icon as any} size={20} color={design.colors.muted} />
      <View className="flex-1 ml-3">
        <Text className="text-base text-soft">{label}</Text>
        <Text className="text-xs text-muted">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: design.colors.brand, false: design.colors.border }}
      />
    </View>
  );
}

function Sep() {
  return <View className="h-px bg-divider ml-14" />;
}
