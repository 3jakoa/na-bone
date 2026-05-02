import { useState } from "react";
import { View, Text, Pressable, ScrollView, Linking, Alert } from "react-native";
import { router } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
import { design } from "../../lib/design";
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
    <View className="flex-1 bg-page">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <EmojiIcon name="chevron-back" size={28} color={design.colors.muted} />
        </Pressable>
        <Text className="text-lg font-bold text-ink ml-3">{t("settings.helpTitle")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ */}
        <Text className="text-sm font-semibold text-muted px-6 mb-2">
          {t("settings.faq")}
        </Text>
        <View className="bg-surface mx-4 rounded-[24px] overflow-hidden border border-line mb-4">
          {faq.map((item, i) => (
            <View key={i}>
              {i > 0 && <View className="h-px bg-divider ml-5" />}
              <Pressable
                onPress={() => setOpenIdx(openIdx === i ? null : i)}
                className="flex-row items-center px-5 py-4"
              >
                <Text className="flex-1 text-base text-soft">
                  {item.q}
                </Text>
                <EmojiIcon
                  name={openIdx === i ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={design.colors.muted}
                />
              </Pressable>
              {openIdx === i && (
                <View className="px-5 pb-4">
                  <Text className="text-sm text-soft leading-5">
                    {item.a}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact */}
        <Text className="text-sm font-semibold text-muted px-6 mb-2">
          {t("settings.contact")}
        </Text>
        <View className="bg-surface mx-4 rounded-[24px] overflow-hidden border border-line mb-4">
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
        <Text className="text-sm font-semibold text-muted px-6 mb-2">
          {t("settings.feedback")}
        </Text>
        <View className="bg-surface mx-4 rounded-[24px] overflow-hidden border border-line mb-4">
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

        <Text className="text-xs text-muted text-center mt-2">
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
      <EmojiIcon name={icon as any} size={20} color={design.colors.muted} />
      <View className="flex-1 ml-3">
        <Text className="text-base text-soft">{title}</Text>
        <Text className="text-xs text-muted">{subtitle}</Text>
      </View>
      <EmojiIcon name="chevron-forward" size={18} color={design.colors.muted} />
    </Pressable>
  );
}

function Sep() {
  return <View className="h-px bg-divider ml-14" />;
}
