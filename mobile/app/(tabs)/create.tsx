import { useEffect } from "react";
import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function CreateRedirect() {
  useEffect(() => {
    router.replace({
      pathname: "/(tabs)/feed",
      params: { compose: "1" },
    } as any);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-neutral-950">
      <ActivityIndicator color="#00A6F6" />
    </View>
  );
}
