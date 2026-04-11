import { useState } from "react";
import { View, Text, Pressable, ScrollView, Linking } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
    a: "Piši nam na pomoc@bonibuddy.app z opisom situacije. Vsako prijavo obravnavamo resno.",
  },
  {
    q: "Ali je aplikacija brezplačna?",
    a: "Da! Boni Buddy je popolnoma brezplačen za vse študente.",
  },
];

export default function Help() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 ml-3">Pomoč</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ */}
        <Text className="text-sm font-semibold text-gray-500 px-6 mb-2">
          Pogosta vprašanja
        </Text>
        <View className="bg-white mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
          {FAQ.map((item, i) => (
            <View key={i}>
              {i > 0 && <View className="h-px bg-gray-100 ml-5" />}
              <Pressable
                onPress={() => setOpenIdx(openIdx === i ? null : i)}
                className="flex-row items-center px-5 py-4"
              >
                <Text className="flex-1 text-base text-gray-800">
                  {item.q}
                </Text>
                <Ionicons
                  name={openIdx === i ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#999"
                />
              </Pressable>
              {openIdx === i && (
                <View className="px-5 pb-4">
                  <Text className="text-sm text-gray-600 leading-5">
                    {item.a}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contact */}
        <Text className="text-sm font-semibold text-gray-500 px-6 mb-2">
          Kontakt
        </Text>
        <View className="bg-white mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
          <HelpRow
            icon="mail-outline"
            title="E-mail"
            subtitle="pomoc@bonibuddy.app"
            onPress={() => Linking.openURL("mailto:pomoc@bonibuddy.app")}
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
        <Text className="text-sm font-semibold text-gray-500 px-6 mb-2">
          Povratne informacije
        </Text>
        <View className="bg-white mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
          <HelpRow
            icon="bug-outline"
            title="Prijavi napako"
            subtitle="Pomagaj nam izboljšati aplikacijo"
            onPress={() =>
              Linking.openURL(
                "mailto:pomoc@bonibuddy.app?subject=Bug%20Report"
              )
            }
          />
          <Sep />
          <HelpRow
            icon="bulb-outline"
            title="Predlagaj funkcijo"
            subtitle="Povej nam kaj si želiš"
            onPress={() =>
              Linking.openURL(
                "mailto:pomoc@bonibuddy.app?subject=Feature%20Request"
              )
            }
          />
        </View>

        <Text className="text-xs text-gray-400 text-center mt-2">
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
      <Ionicons name={icon as any} size={20} color="#555" />
      <View className="flex-1 ml-3">
        <Text className="text-base text-gray-800">{title}</Text>
        <Text className="text-xs text-gray-400">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </Pressable>
  );
}

function Sep() {
  return <View className="h-px bg-gray-100 ml-14" />;
}
