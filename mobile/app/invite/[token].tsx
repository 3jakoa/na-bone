import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
import { design } from "../../lib/design";
import { supabase } from "../../lib/supabase";
import {
  clearPendingBuddyInviteToken,
  setPendingBuddyInviteToken,
} from "../../lib/buddyInvites";
import { useLanguage, type TranslationKey } from "../../lib/i18n";

type Preview = {
  status: "valid" | "used" | "expired" | "not_found";
  inviter_name: string | null;
  inviter_faculty: string | null;
  inviter_photo: string | null;
};

function getInviteError(
  status: Preview["status"] | undefined,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
) {
  if (status === "used" || status === "expired" || status === "not_found") {
    return t("invite.invalid");
  }
  return null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export default function BuddyInvite() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    if (!isUuid(token)) {
      await clearPendingBuddyInviteToken();
      setError(t("invite.invalid"));
      setLoading(false);
      return;
    }

    const { data, error: previewError } = await supabase
      .rpc("get_buddy_invite_preview", { p_token: token })
      .maybeSingle();

    if (previewError) {
      setError(previewError.message);
      setLoading(false);
      return;
    }

    const nextPreview = data as Preview | null;
    setPreview(nextPreview);
    const linkError = getInviteError(nextPreview?.status, t);
    if (linkError) {
      await clearPendingBuddyInviteToken();
      setError(linkError);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      await setPendingBuddyInviteToken(token);
      setLoading(false);
      return router.replace("/auth/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      await setPendingBuddyInviteToken(token);
      setLoading(false);
      return router.replace("/onboarding");
    }

    setLoading(false);
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function acceptInvite() {
    if (!token) return;
    setAccepting(true);
    const { data, error: acceptError } = await supabase.rpc(
      "accept_buddy_invite",
      { p_token: token }
    );
    setAccepting(false);

    if (acceptError) {
      const message = acceptError.message || t("invite.acceptFailed");
      if (
        message.includes("veljavna") ||
        message.includes("uporabljena") ||
        message.includes("potekla")
      ) {
        await clearPendingBuddyInviteToken();
      }
      return Alert.alert(t("common.error"), message);
    }

    await clearPendingBuddyInviteToken();
    router.replace(`/matches/${data as string}`);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-page items-center justify-center">
        <ActivityIndicator color={design.colors.brand} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-page px-6 justify-center">
      <View className="bg-surface rounded-[24px] p-6 items-center border border-line">
        {preview?.inviter_photo ? (
          <Image
            source={{ uri: preview.inviter_photo }}
            style={{ width: 88, height: 88, borderRadius: 44 }}
          />
        ) : (
          <View
            className="rounded-full bg-brand-light items-center justify-center"
            style={{ width: 88, height: 88 }}
          >
            <EmojiIcon name="person" size={36} color={design.colors.brand} />
          </View>
        )}

        <Text className="text-2xl font-bold text-ink text-center mt-5">
          {error
            ? t("invite.brokenTitle")
            : t("invite.invitesYou", {
                name: preview?.inviter_name ?? t("invite.someone"),
              })}
        </Text>
        <Text className="text-muted text-center mt-2 leading-5">
          {error
            ? error
            : t("invite.body")}
        </Text>
        {!error && preview?.inviter_faculty ? (
          <Text className="text-xs text-muted text-center mt-2">
            {preview.inviter_faculty}
          </Text>
        ) : null}

        {error ? (
          <Pressable
            onPress={() => router.replace("/")}
            className="bg-field rounded-[24px] py-4 px-6 mt-6 w-full items-center"
          >
            <Text className="text-soft font-bold">
              {t("invite.backToApp")}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={acceptInvite}
            disabled={accepting}
            className="bg-brand rounded-[24px] py-4 px-6 mt-6 w-full items-center"
          >
            <Text className="text-white font-bold">
              {accepting ? t("invite.accepting") : t("invite.accept")}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
