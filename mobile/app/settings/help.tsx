import { useState } from "react";
import { View, Text, Pressable, ScrollView, Linking, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage, type TranslationKey } from "../../lib/i18n";

const SUPPORT_EMAIL = "bonibuddyapp@gmail.com";

async function openEmail(
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
  subject?: string
) {
  const url = subject
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${SUPPORT_EMAIL}`;

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    Alert.alert(
      t("settings.mailUnavailable"),
      t("settings.mailUnavailableBody", { email: SUPPORT_EMAIL })
    );
    return;
  }

  await Linking.openURL(url);
}

export default function Help() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const { t } = useLanguage();
  const faq = [
    { q: t("faq.whatTitle"), a: t("faq.whatBody") },
    { q: t("faq.boniTitle"), a: t("faq.boniBody") },
    { q: t("faq.buddyTitle"), a: t("faq.buddyBody") },
    { q: t("faq.emailTitle"), a: t("faq.emailBody") },
    { q: t("faq.deleteTitle"), a: t("faq.deleteBody") },
    { q: t("faq.reportTitle"), a: t("faq.reportBody", { email: SUPPORT_EMAIL }) },
    { q: t("faq.freeTitle"), a: t("faq.freeBody") },
  ];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#888" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 dark:text-white ml-3">{t("settings.helpTitle")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ */}
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-6 mb-2">
          {t("settings.faq")}
        </Text>
        <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
          {faq.map((item, i) => (
            <View key={i}>
              {i > 0 && <View className="h-px bg-gray-100 dark:bg-neutral-800 ml-5" />}
              <Pressable
                onPress={() => setOpenIdx(openIdx === i ? null : i)}
                className="flex-row items-center px-5 py-4"
              >
                <Text className="flex-1 text-base text-gray-800 dark:text-gray-100">
                  {item.q}
                </Text>
                <Ionicons
                  name={openIdx === i ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#888"
                />
              </Pressable>
              {openIdx === i && (
                <View className="px-5 pb-4">
                  <Text className="text-sm text-gray-600 dark:text-gray-300 leading-5">
                    {item.a}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact */}
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-6 mb-2">
          {t("settings.contact")}
        </Text>
        <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
          <HelpRow
            icon="mail-outline"
            title="E-mail"
            subtitle={SUPPORT_EMAIL}
            onPress={() => {
              void openEmail(t);
            }}
          />
          <Sep />
          <HelpRow
            icon="logo-instagram"
            title="Instagram"
            subtitle="@boni_buddy"
            onPress={() =>
              Linking.openURL("https://instagram.com/boni_buddy")
            }
          />
        </View>

        {/* Feedback */}
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-6 mb-2">
          {t("settings.feedback")}
        </Text>
        <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
          <HelpRow
            icon="bug-outline"
            title={t("settings.reportBug")}
            subtitle={t("settings.reportBugDesc")}
            onPress={() => {
              void openEmail(t, "Bug Report");
            }}
          />
          <Sep />
          <HelpRow
            icon="bulb-outline"
            title={t("settings.suggestFeature")}
            subtitle={t("settings.suggestFeatureDesc")}
            onPress={() => {
              void openEmail(t, "Feature Request");
            }}
          />
        </View>

        <Text className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
          Boni Buddy v0.0.1
        </Text>
      </ScrollView>
    </View>
  );
}

function HelpRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-5 py-4">
      <Ionicons name={icon as any} size={20} color="#888" />
      <View className="flex-1 ml-3">
        <Text className="text-base text-gray-800 dark:text-gray-100">{title}</Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#888" />
    </Pressable>
  );
}

function Sep() {
  return <View className="h-px bg-gray-100 dark:bg-neutral-800 ml-14" />;
}
