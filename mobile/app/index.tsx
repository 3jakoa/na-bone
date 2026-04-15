import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { getPendingBuddyInviteToken } from "../lib/buddyInvites";

export default function Index() {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      // Verify the session against the server — getSession() only reads from
      // local storage and will happily return a token that the server has
      // already invalidated.
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userErr || !userData.user) {
        await supabase.auth.signOut().catch(() => {});
        return router.replace("/auth/login");
      }

      // Look up the profile row. Gate routing on row EXISTENCE, not on the
      // is_onboarded flag — a stale `false` flag from an earlier bug would
      // otherwise force the user through onboarding every login even though
      // their data is all there.
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id, is_onboarded")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (cancelled) return;

      if (profErr) {
        // Real query failure (network, RLS, schema) — don't route the user
        // anywhere; show a retry screen so we don't silently kick them to
        // onboarding and lose their data.
        setError(profErr.message);
        return;
      }

      if (!profile) {
        // Genuinely no profile row yet → first-run onboarding.
        return router.replace("/onboarding");
      }

      // Self-heal: profile exists but flag was never flipped. Set it now so
      // downstream queries that filter on is_onboarded behave correctly.
      if (!profile.is_onboarded) {
        await supabase
          .from("profiles")
          .update({ is_onboarded: true })
          .eq("id", profile.id);
      }

      const pendingInviteToken = await getPendingBuddyInviteToken();
      if (pendingInviteToken) {
        return router.replace(`/invite/${pendingInviteToken}` as any);
      }

      router.replace("/(tabs)/discover");
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-neutral-950 px-8">
        <Text className="text-base font-semibold text-gray-900 dark:text-white text-center mb-2">
          Ne morem naložiti profila
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          {error}
        </Text>
        <Pressable
          onPress={() => setAttempt((a) => a + 1)}
          className="bg-brand rounded-2xl px-6 py-3"
        >
          <Text className="text-white font-bold">Poskusi znova</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace("/auth/login");
          }}
          className="mt-3 px-6 py-3"
        >
          <Text className="text-gray-500 dark:text-gray-400 font-semibold">
            Odjava
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-neutral-950">
      <ActivityIndicator size="large" color="#00A6F6" />
    </View>
  );
}
