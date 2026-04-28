import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../lib/i18n";

export default function Terms() {
  const { t } = useLanguage();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#888" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 dark:text-white ml-3">
          {t("settings.termsTitle")}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <View className="bg-white dark:bg-neutral-900 rounded-3xl px-5 py-5 shadow-sm">
          <Section title={t("terms.generalTitle")}>{t("terms.generalBody")}</Section>
          <Section title={t("terms.accountTitle")}>{t("terms.accountBody")}</Section>
          <Section title={t("terms.contentTitle")}>{t("terms.contentBody")}</Section>
          <Section title={t("terms.privacyTitle")}>{t("terms.privacyBody")}</Section>
          <Section title={t("terms.liabilityTitle")}>{t("terms.liabilityBody")}</Section>
          <Section title={t("terms.changesTitle")}>{t("terms.changesBody")}</Section>

          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-6 text-center">
            {t("settings.lastUpdated")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className="mb-5">
      <Text className="text-base font-bold text-gray-900 dark:text-white mb-2">{title}</Text>
      <Text className="text-sm text-gray-600 dark:text-gray-300 leading-5">{children}</Text>
    </View>
  );
}
