import { useState } from "react";
import { View, Text, Pressable, ScrollView, Linking, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const SUPPORT_EMAIL = "bonibuddyapp@gmail.com";

async function openEmail(subject?: string) {
  const url = subject
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${SUPPORT_EMAIL}`;

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    Alert.alert(
      "Mail ni na voljo",
      `V simulatorju pogosto ni nastavljene Mail aplikacije. Piši na ${SUPPORT_EMAIL}.`
    );
    return;
  }

  await Linking.openURL(url);
}

const FAQ = [
  {
    q: "Kaj je Boni Buddy?",
    a: "Boni Buddy je aplikacija, ki študentom pomaga najti družbo za kosilo na študentske bone. Swipaj profile, se poveži in skupaj pojejta kosilo!",
  },
  {
    q: "Kako delujejo boni?",
    a: "Objavi bon z restavracijo in časom — drugi študentje se lahko pridružijo. Lahko objaviš javno (vsi vidijo) ali zasebno (samo tvoji buddyji).",
  },
  {
    q: "Kako dobim buddyja?",
    a: "Na zavihku Išči swipaj desno na profile, ki ti ustrezajo. Če oba swipata desno, postaneta buddyja in si lahko pišeta.",
  },
  {
    q: "Ali potrebujem študentski e-mail?",
    a: "Za zdaj ne, ampak v prihodnosti bomo zahtevali študentski e-mail za verifikacijo.",
  },
  {
    q: "Kako izbrišem svoj račun?",
    a: "Pojdi na Profil > Zasebnost > Izbriši račun. Tvoji podatki bodo trajno odstranjeni.",
  },
  {
    q: "Kako prijavim neprimerno vsebino?",
    a: `Piši nam na ${SUPPORT_EMAIL} z opisom situacije. Vsako prijavo obravnavamo resno.`,
  },
  {
    q: "Ali je aplikacija brezplačna?",
    a: "Da! Boni Buddy je popolnoma brezplačen za vse študente.",
  },
];

export default function Help() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#888" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 dark:text-white ml-3">Pomoč</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ */}
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-6 mb-2">
          Pogosta vprašanja
        </Text>
        <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
          {FAQ.map((item, i) => (
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
          Kontakt
        </Text>
        <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
          <HelpRow
            icon="mail-outline"
            title="E-mail"
            subtitle={SUPPORT_EMAIL}
            onPress={() => {
              void openEmail();
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
          Povratne informacije
        </Text>
        <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
          <HelpRow
            icon="bug-outline"
            title="Prijavi napako"
            subtitle="Pomagaj nam izboljšati aplikacijo"
            onPress={() => {
              void openEmail("Bug Report");
            }}
          />
          <Sep />
          <HelpRow
            icon="bulb-outline"
            title="Predlagaj funkcijo"
            subtitle="Povej nam kaj si želiš"
            onPress={() => {
              void openEmail("Feature Request");
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
