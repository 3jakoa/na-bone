import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
import { design } from "../../lib/design";
import { useLanguage } from "../../lib/i18n";

export default function Terms() {
  const { t } = useLanguage();

  return (
    <View className="flex-1 bg-page">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <EmojiIcon name="chevron-back" size={28} color={design.colors.muted} />
        </Pressable>
        <Text className="text-lg font-bold text-ink ml-3">
          {t("settings.termsTitle")}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <View className="bg-surface rounded-[24px] px-5 py-5 border border-line">
          <Section title={t("terms.generalTitle")}>{t("terms.generalBody")}</Section>
          <Section title={t("terms.accountTitle")}>{t("terms.accountBody")}</Section>
          <Section title={t("terms.contentTitle")}>{t("terms.contentBody")}</Section>
          <Section title={t("terms.privacyTitle")}>{t("terms.privacyBody")}</Section>
          <Section title={t("terms.liabilityTitle")}>{t("terms.liabilityBody")}</Section>
          <Section title={t("terms.changesTitle")}>{t("terms.changesBody")}</Section>

          <Text className="text-xs text-muted mt-6 text-center">
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
      <Text className="text-base font-bold text-ink mb-2">{title}</Text>
      <Text className="text-sm text-soft leading-5">{children}</Text>
    </View>
  );
}
