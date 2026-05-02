import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import * as Network from "expo-network";
import { AnimatedSplashScreen } from "../components/AnimatedSplashScreen";
import { useProductVariant } from "../lib/productVariant";
import { supabase } from "../lib/supabase";
import { getPendingBuddyInviteToken } from "../lib/buddyInvites";
import { useLanguage } from "../lib/i18n";

function isOfflineNetworkState(state: Network.NetworkState) {
  const reachable = state.isInternetReachable ?? state.isConnected;
  return reachable === false || state.type === Network.NetworkStateType.NONE;
}

export default function Index() {
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { setProductVariant } = useProductVariant();
  const { t } = useLanguage();

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
          setProductVariant("control");
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
          .select("id, is_onboarded, product_variant")
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
          setProductVariant("control");
          // Genuinely no profile row yet → first-run onboarding.
          return router.replace("/onboarding");
        }

        setProductVariant(profile.product_variant ?? "control");

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

        router.replace("/(tabs)/feed");
      } catch (bootstrapError: any) {
        if (cancelled) return;
        setError(bootstrapError?.message ?? t("bootstrap.startError"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, setProductVariant, t]);

  if (offline) {
    return (
      <View className="flex-1 items-center justify-center bg-page px-8">
        <View className="w-full max-w-sm bg-surface rounded-[24px] px-6 py-8 border border-line">
          <Text className="text-2xl font-bold text-ink text-center mb-3">
            {t("bootstrap.offlineTitle")}
          </Text>
          <Text className="text-base text-soft text-center leading-6 mb-4">
            {t("bootstrap.offlineBody")}
          </Text>
          <Text className="text-sm text-muted text-center leading-5 mb-6">
            {t("bootstrap.offlineHint")}
          </Text>
          <Pressable
            onPress={() => setAttempt((value) => value + 1)}
            className="bg-brand rounded-[24px] px-6 py-4 items-center"
          >
            <Text className="text-white font-bold text-base">{t("common.retry")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-page px-8">
        <Text className="text-base font-semibold text-ink text-center mb-2">
          {t("bootstrap.profileLoadFailed")}
        </Text>
        <Text className="text-sm text-muted text-center mb-6">
          {error}
        </Text>
        <Pressable
          onPress={() => setAttempt((a) => a + 1)}
          className="bg-brand rounded-[24px] px-6 py-3"
        >
          <Text className="text-white font-bold">{t("common.retry")}</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace("/auth/login");
          }}
          className="mt-3 px-6 py-3"
        >
          <Text className="text-muted font-semibold">
            {t("common.logout")}
          </Text>
        </Pressable>
      </View>
    );
  }

  return <AnimatedSplashScreen />;
}
