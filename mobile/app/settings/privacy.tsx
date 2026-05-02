import { useState } from "react";
import { View, Text, Pressable, Switch, Alert } from "react-native";
import { router } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
import { design } from "../../lib/design";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../lib/i18n";

export default function Privacy() {
  const [showAge, setShowAge] = useState(true);
  const [showBio, setShowBio] = useState(true);
  const [showUni, setShowUni] = useState(true);
  const { t } = useLanguage();

  async function signOut() {
    Alert.alert(
      t("common.logout"),
      t("settings.logoutConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.logout"),
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/auth/login");
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
        <Text className="text-lg font-bold text-ink ml-3">{t("settings.privacyTitle")}</Text>
      </View>

      <View className="bg-surface mx-4 rounded-[24px] overflow-hidden border border-line">
        <ToggleRow
          icon="calendar-outline"
          label={t("settings.showAge")}
          value={showAge}
          onToggle={setShowAge}
        />
        <Sep />
        <ToggleRow
          icon="document-text-outline"
          label={t("settings.showBio")}
          value={showBio}
          onToggle={setShowBio}
        />
        <Sep />
        <ToggleRow
          icon="school-outline"
          label={t("settings.showUniversity")}
          value={showUni}
          onToggle={setShowUni}
        />
      </View>

      <Pressable
        onPress={signOut}
        className="bg-surface mx-4 mt-6 rounded-[24px] py-4 items-center border border-line"
      >
        <Text className="font-semibold text-base" style={{ color: design.colors.danger }}>
          {t("common.logout")}
        </Text>
      </Pressable>

      <Text className="text-xs text-muted text-center mt-4 px-8">
        {t("settings.privacyHint")}
      </Text>
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onToggle,
}: {
  icon: string;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center px-5 py-4">
      <EmojiIcon name={icon as any} size={20} color={design.colors.muted} />
      <Text className="flex-1 ml-3 text-base text-soft">{label}</Text>
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
