import { useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { EmojiIcon } from "../../components/EmojiIcon";
import { supabase, type Profile } from "../../lib/supabase";
import {
  getEducationLevelLabel,
  getGenderLabel,
  useLanguage,
} from "../../lib/i18n";
import { LanguageSwitch } from "../../components/LanguageSwitch";
import { design } from "../../lib/design";

export default function ProfileScreen() {
  const [me, setMe] = useState<Profile | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const { t } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return router.replace("/auth/login");
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        const p = data as Profile;
        setMe(p);

        if (p) {
          const { count: mc } = await supabase
            .from("buddy_matches")
            .select("*", { count: "exact", head: true })
            .or(`user1_id.eq.${p.id},user2_id.eq.${p.id}`);
          setMatchCount(mc ?? 0);
        }
      })();
    }, [])
  );

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  if (!me) return <View className="flex-1 bg-page" />;

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="pt-16 px-6 flex-row justify-end mb-4">
        <Pressable
          onPress={() => router.push("/edit-profile")}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center"
        >
          <EmojiIcon name="pencil" size={18} color={design.colors.muted} />
        </Pressable>
      </View>

      {/* Avatar + name */}
      <View className="items-center px-6 mb-4">
        <Pressable
          onPress={() => {
            if (me.photos.length > 0) {
              router.push({
                pathname: "/photo-viewer",
                params: { photos: JSON.stringify(me.photos), index: "0" },
              });
            }
          }}
        >
          {me.photos[0] ? (
            <Image
              source={{ uri: me.photos[0] }}
              style={{ width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: design.colors.white }}
            />
          ) : (
            <View className="w-32 h-32 rounded-full bg-brand-light items-center justify-center border-4 border-white">
              <Text className="text-5xl font-bold text-brand-dark">
                {me.name[0]}
              </Text>
            </View>
          )}
        </Pressable>
        <Text className="text-2xl font-bold mt-4 text-ink">
          {me.name}, {me.age}
        </Text>
        <View className="flex-row items-center mt-1">
          <EmojiIcon name="school-outline" size={14} color={design.colors.muted} />
          <Text className="text-muted ml-1">{me.faculty}</Text>
        </View>
        <Text className="text-muted text-sm">{me.university}</Text>
        {me.education_level && (
          <View className="bg-brand-light rounded-full px-3 py-1 mt-2">
            <Text className="text-brand-dark text-xs font-semibold">
              {getEducationLevelLabel(me.education_level, t)}
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View className="mx-4 mb-4">
        <Pressable
          onPress={() => router.push("/settings/buddies")}
          className="bg-surface rounded-[24px] px-5 py-4 flex-row items-center border border-line"
        >
          <Text className="text-xl leading-6">🤩</Text>
          <Text className="flex-1 ml-3 text-base font-semibold text-ink">
            {t("common.buddies")}
          </Text>
          <Text className="text-base font-bold text-ink mr-2">
            {matchCount}
          </Text>
          <EmojiIcon name="chevron-forward" size={18} color={design.colors.muted} />
        </Pressable>
      </View>

      {/* Bio */}
      <View className="bg-surface mx-4 rounded-[24px] px-5 py-4 mb-4 border border-line">
        <Text className="text-sm font-semibold text-muted mb-1.5">
          {t("profile.aboutMe")}
        </Text>
        <Text className="text-base text-soft leading-6">
          {me.bio || t("profile.noBio")}
        </Text>
      </View>

      {/* Photos */}
      {me.photos.length > 0 && (
        <View className="bg-surface mx-4 rounded-[24px] px-5 py-4 mb-4 border border-line">
          <Text className="text-sm font-semibold text-muted mb-3">
            {t("profile.photos")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {me.photos.map((uri, i) => (
                <Pressable
                  key={i}
                  onPress={() =>
                    router.push({
                      pathname: "/photo-viewer",
                      params: {
                        photos: JSON.stringify(me.photos),
                        index: String(i),
                      },
                    })
                  }
                >
                  <Image
                    source={{ uri }}
                    style={{ width: 112, height: 112, borderRadius: 16 }}
                  />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Details */}
      <View className="bg-surface mx-4 rounded-[24px] overflow-hidden mb-4 border border-line">
        <DetailRow icon="person-outline" label={t("profile.gender")} value={getGenderLabel(me.gender, t)} />
        <Sep />
        <DetailRow
          icon="school-outline"
          label={t("profile.faculty")}
          value={me.faculty}
        />
        <Sep />
        <DetailRow
          icon="library-outline"
          label={t("profile.university")}
          value={me.university}
        />
        {me.education_level && (
          <>
            <Sep />
            <DetailRow
              icon="ribbon-outline"
              label={t("profile.educationLevel")}
              value={getEducationLevelLabel(me.education_level, t)}
            />
          </>
        )}
      </View>

      {/* Settings */}
      <View className="bg-surface mx-4 rounded-[24px] overflow-hidden mb-4 border border-line">
        <View className="flex-row items-center px-5 py-3.5">
          <EmojiIcon name="language-outline" size={20} color={design.colors.muted} />
          <Text className="flex-1 ml-3 text-base text-soft">
            {t("common.language")}
          </Text>
          <LanguageSwitch />
        </View>
        <Sep />
        <SettingsRow
          icon="notifications-outline"
          label={t("profile.notifications")}
          onPress={() => router.push("/settings/notifications")}
        />
        <Sep />
        <SettingsRow
          icon="shield-checkmark-outline"
          label={t("profile.privacy")}
          onPress={() => router.push("/settings/privacy")}
        />
        <Sep />
        <SettingsRow
          icon="ban-outline"
          label={t("profile.blockedUsers")}
          onPress={() => router.push("/settings/blocked")}
        />
        <Sep />
        <SettingsRow
          icon="help-circle-outline"
          label={t("profile.help")}
          onPress={() => router.push("/settings/help")}
        />
        <Sep />
        <SettingsRow
          icon="document-text-outline"
          label={t("profile.terms")}
          onPress={() => router.push("/settings/terms")}
        />
      </View>

      {/* Logout */}
      <Pressable
        onPress={logout}
        className="bg-surface mx-4 rounded-[24px] py-4 items-center border border-line"
      >
        <Text className="font-semibold text-base" style={{ color: design.colors.danger }}>{t("common.logout")}</Text>
      </Pressable>
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center px-5 py-3.5">
      <EmojiIcon name={icon as any} size={18} color={design.colors.muted} />
      <Text className="text-sm text-muted ml-3 w-20">{label}</Text>
      <Text className="text-sm text-ink flex-1 text-right">{value}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-5 py-3.5">
      <EmojiIcon name={icon as any} size={20} color={design.colors.muted} />
      <Text className="flex-1 ml-3 text-base text-soft">{label}</Text>
      <EmojiIcon name="chevron-forward" size={18} color={design.colors.muted} />
    </Pressable>
  );
}

function Sep() {
  return <View className="h-px bg-field ml-14" />;
}
