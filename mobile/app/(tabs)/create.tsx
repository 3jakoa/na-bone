import { useEffect } from "react";
import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { design } from "../../lib/design";

export default function CreateRedirect() {
  useEffect(() => {
    router.replace({
      pathname: "/(tabs)/feed",
      params: { compose: "1" },
    } as any);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-page">
      <ActivityIndicator color={design.colors.brand} />
    </View>
  );
}
