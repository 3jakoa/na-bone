import { useState } from "react";
import { View, Text, Pressable, Switch, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#888" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 dark:text-white ml-3">{t("settings.privacyTitle")}</Text>
      </View>

      <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl overflow-hidden shadow-sm">
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
        className="bg-white dark:bg-neutral-900 mx-4 mt-6 rounded-3xl py-4 items-center shadow-sm"
      >
        <Text className="text-red-500 font-semibold text-base">
          {t("common.logout")}
        </Text>
      </Pressable>

      <Text className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4 px-8">
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
      <Ionicons name={icon as any} size={20} color="#888" />
      <Text className="flex-1 ml-3 text-base text-gray-800 dark:text-gray-100">{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: "#00A6F6", false: "#e5e5e5" }}
      />
    </View>
  );
}

function Sep() {
  return <View className="h-px bg-gray-100 dark:bg-neutral-800 ml-14" />;
}
