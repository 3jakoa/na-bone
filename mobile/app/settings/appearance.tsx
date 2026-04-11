import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, type ThemePref } from "../../lib/theme";

type Option = {
  key: ThemePref;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const OPTIONS: Option[] = [
  {
    key: "light",
    label: "Svetla",
    description: "Vedno svetla tema",
    icon: "sunny-outline",
  },
  {
    key: "dark",
    label: "Temna",
    description: "Vedno temna tema",
    icon: "moon-outline",
  },
  {
    key: "system",
    label: "Sistem",
    description: "Sledi sistemski nastavitvi",
    icon: "phone-portrait-outline",
  },
];

export default function Appearance() {
  const { pref, setPref, scheme } = useTheme();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons
            name="chevron-back"
            size={28}
            color={scheme === "dark" ? "#e5e5e5" : "#333"}
          />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 dark:text-white ml-3">
          Videz
        </Text>
      </View>

      <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl overflow-hidden shadow-sm">
        {OPTIONS.map((opt, i) => {
          const selected = pref === opt.key;
          return (
            <View key={opt.key}>
              {i > 0 && (
                <View className="h-px bg-gray-100 dark:bg-neutral-800 ml-14" />
              )}
              <Pressable
                onPress={() => setPref(opt.key)}
                className="flex-row items-center px-5 py-4"
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={scheme === "dark" ? "#ccc" : "#555"}
                />
                <View className="flex-1 ml-3">
                  <Text className="text-base text-gray-800 dark:text-gray-100">
                    {opt.label}
                  </Text>
                  <Text className="text-xs text-gray-400 dark:text-gray-500">
                    {opt.description}
                  </Text>
                </View>
                {selected && (
                  <Ionicons name="checkmark" size={22} color="#00A6F6" />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4 px-8">
        Izbira se shrani v napravi in se uporabi ob naslednjem odprtju aplikacije.
      </Text>
    </View>
  );
}
