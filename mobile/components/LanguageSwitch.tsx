import { Pressable, Text, View } from "react-native";
import { useLanguage } from "../lib/i18n";

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  const isEnglish = language === "en";

  return (
    <View className="flex-row items-center gap-2">
      <Text
        className={`text-xs font-semibold ${
          !isEnglish ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"
        }`}
      >
        Slovenščina
      </Text>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isEnglish }}
        accessibilityLabel="Preklop jezika"
        onPress={() => {
          void setLanguage(isEnglish ? "sl" : "en");
        }}
        className={`h-7 w-12 rounded-full p-1 ${
          isEnglish ? "bg-brand" : "bg-gray-200 dark:bg-neutral-700"
        }`}
      >
        <View
          className="h-5 w-5 rounded-full bg-white shadow-sm"
          style={{
            transform: [{ translateX: isEnglish ? 20 : 0 }],
          }}
        />
      </Pressable>
      <Text
        className={`text-xs font-semibold ${
          isEnglish ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"
        }`}
      >
        English
      </Text>
    </View>
  );
}
