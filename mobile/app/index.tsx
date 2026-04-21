import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { router } from "expo-router";
import * as Network from "expo-network";
import { supabase } from "../lib/supabase";
import { getPendingBuddyInviteToken } from "../lib/buddyInvites";

function isOfflineNetworkState(state: Network.NetworkState) {
  const reachable = state.isInternetReachable ?? state.isConnected;
  return reachable === false || state.type === Network.NetworkStateType.NONE;
}

export default function Index() {
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!offline) return;

    let retried = false;
    const subscription = Network.addNetworkStateListener((state) => {
      if (!retried && !isOfflineNetworkState(state)) {
        retried = true;
        setAttempt((value) => value + 1);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [offline]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setError(null);
      setOffline(false);

      try {
        const {
          data: { session },
          error: sessionErr,
        } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session) {
          if (sessionErr) {
            const latestNetworkState = await Network.getNetworkStateAsync();
            if (cancelled) return;
            if (isOfflineNetworkState(latestNetworkState)) {
              setOffline(true);
              return;
            }

            setError(sessionErr.message);
            return;
          }

          return router.replace("/auth/login");
        }

        const initialNetworkState = await Network.getNetworkStateAsync();
        if (cancelled) return;
        if (isOfflineNetworkState(initialNetworkState)) {
          setOffline(true);
          return;
        }

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (cancelled) return;
        if (userErr || !userData.user) {
          const latestNetworkState = await Network.getNetworkStateAsync();
          if (cancelled) return;
          if (isOfflineNetworkState(latestNetworkState)) {
            setOffline(true);
            return;
          }

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
          const latestNetworkState = await Network.getNetworkStateAsync();
          if (cancelled) return;
          if (isOfflineNetworkState(latestNetworkState)) {
            setOffline(true);
            return;
          }

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
      } catch (bootstrapError: any) {
        if (cancelled) return;
        setError(bootstrapError?.message ?? "Pri zagonu aplikacije je prišlo do napake.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (offline) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-neutral-950 px-8">
        <View className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl px-6 py-8 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
            Ni internetne povezave
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-300 text-center leading-6 mb-4">
            Za uporabo aplikacije vklopi internetno povezavo.
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center leading-5 mb-6">
            Ko bo povezava znova na voljo, lahko nadaljuješ brez ponovnega prijavljanja.
          </Text>
          <Pressable
            onPress={() => setAttempt((value) => value + 1)}
            className="bg-brand rounded-2xl px-6 py-4 items-center"
          >
            <Text className="text-white font-bold text-base">Poskusi znova</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
