import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export default function Index() {
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/auth/login");

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_onboarded")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profile || !profile.is_onboarded) router.replace("/onboarding");
      else router.replace("/(tabs)/discover");
    })();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-brand">
      <ActivityIndicator color="#fff" />
    </View>
  );
}
