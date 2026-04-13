import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Terms() {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#888" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 dark:text-white ml-3">
          Pogoji uporabe
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <View className="bg-white dark:bg-neutral-900 rounded-3xl px-5 py-5 shadow-sm">
          <Section title="1. Splošno">
            Boni Buddy je mobilna aplikacija namenjena povezovanju študentov pri
            koriščenju študentskih bonov. Z uporabo aplikacije se strinjate s
            temi pogoji.
          </Section>

          <Section title="2. Uporabniški račun">
            Za uporabo aplikacije potrebujete veljaven študentski e-mail naslov.
            Odgovorni ste za varnost svojega računa in vseh aktivnosti pod
            njim.
          </Section>

          <Section title="3. Vsebina">
            Uporabniki so odgovorni za vsebino, ki jo objavljajo. Prepovedana
            je objava žaljive, diskriminatorne ali nezakonite vsebine.
          </Section>

          <Section title="4. Zasebnost">
            Vaše osebne podatke obdelujemo v skladu z GDPR. Podrobnosti
            najdete v naši politiki zasebnosti.
          </Section>

          <Section title="5. Omejitev odgovornosti">
            Boni Buddy ne prevzema odgovornosti za interakcije med uporabniki
            zunaj aplikacije ali za morebitne škode nastale pri uporabi.
          </Section>

          <Section title="6. Spremembe pogojev">
            Pridržujemo si pravico do spremembe teh pogojev. O bistvenih
            spremembah bomo uporabnike obvestili prek aplikacije.
          </Section>

          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-6 text-center">
            Zadnja posodobitev: april 2026
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
