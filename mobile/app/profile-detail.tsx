import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { EmojiIcon } from "../components/EmojiIcon";
import { design } from "../lib/design";
import { supabase, type Profile } from "../lib/supabase";
import { getEducationLevelLabel, getGenderLabel, useLanguage } from "../lib/i18n";

const { width } = Dimensions.get("window");

export default function ProfileDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [meId, setMeId] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (data) setProfile(data as Profile);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: me } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (me) {
        setMeId(me.id);
        const { count } = await supabase
          .from("blocked_users")
          .select("*", { count: "exact", head: true })
          .eq("blocker_id", me.id)
          .eq("blocked_id", id);
        setIsBlocked((count ?? 0) > 0);
      }
    })();
  }, [id]);

  if (!profile) return <View className="flex-1 bg-page" />;

  const photos = profile.photos.length > 0 ? profile.photos : [];

  return (
    <View className="flex-1 bg-page">
      <View className="absolute top-0 left-0 right-0 z-20 flex-row items-center justify-between px-5 pt-16 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/30 items-center justify-center"
        >
          <EmojiIcon name="chevron-back" size={24} color={design.colors.white} />
        </Pressable>
      </View>

      <ScrollView bounces={false}>
        {photos.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setPhotoIdx(
                  Math.round(e.nativeEvent.contentOffset.x / width)
                );
              }}
            >
              {photos.map((uri, i) => (
                <Pressable
                  key={i}
                  onPress={() =>
                    router.push({
                      pathname: "/photo-viewer",
                      params: {
                        photos: JSON.stringify(photos),
                        index: String(i),
                      },
                    })
                  }
                >
                  <Image
                    source={{ uri }}
                    style={{ width, height: width * 1.2 }}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
            {photos.length > 1 && (
              <View className="flex-row justify-center gap-1.5 mt-3">
                {photos.map((_, i) => (
                  <View
                    key={i}
                    className={`w-2 h-2 rounded-full ${i === photoIdx ? "bg-brand" : "bg-subtle"}`}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View
            style={{ width, height: width }}
            className="bg-brand-light items-center justify-center"
          >
            <Text className="text-8xl font-bold text-brand-dark">
              {profile.name[0]}
            </Text>
          </View>
        )}

        <View className="px-6 pt-6 pb-10">
          <Text className="text-3xl font-bold text-ink">
            {profile.name}, {profile.age}
          </Text>

          <View className="flex-row items-center mt-2">
            <EmojiIcon name="school-outline" size={16} color={design.colors.muted} />
            <Text className="text-base text-muted ml-1.5">
              {profile.faculty}
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <EmojiIcon name="library-outline" size={16} color={design.colors.muted} />
            <Text className="text-sm text-muted ml-1.5">
              {profile.university}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2 mt-3">
            <View className="bg-field rounded-full px-3 py-1.5">
              <Text className="text-sm text-soft">{getGenderLabel(profile.gender, t)}</Text>
            </View>
            {profile.education_level && (
              <View className="bg-brand-light rounded-full px-3 py-1.5">
                <Text className="text-sm text-brand-dark font-semibold">
                  {getEducationLevelLabel(profile.education_level, t)}
                </Text>
              </View>
            )}
          </View>

          {profile.bio && (
            <View className="mt-5">
              <Text className="text-sm font-semibold text-muted mb-1.5">
                {t("profile.aboutMe")}
              </Text>
              <Text className="text-base text-soft leading-6">
                {profile.bio}
              </Text>
            </View>
          )}

          {meId && meId !== profile.id && (
            <Pressable
              onPress={() => {
                if (isBlocked) {
                  Alert.alert(
                    t("profileDetail.unblockTitle"),
                    t("profileDetail.unblockConfirm", { name: profile.name }),
                    [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: t("common.unblock"),
                        onPress: async () => {
                          await supabase
                            .from("blocked_users")
                            .delete()
                            .eq("blocker_id", meId)
                            .eq("blocked_id", profile.id);
                          setIsBlocked(false);
                        },
                      },
                    ]
                  );
                } else {
                  Alert.alert(
                    t("profileDetail.blockTitle"),
                    t("profileDetail.blockConfirm", { name: profile.name }),
                    [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: t("common.block"),
                        style: "destructive",
                        onPress: async () => {
                          await supabase.from("blocked_users").insert({
                            blocker_id: meId,
                            blocked_id: profile.id,
                          });
                          setIsBlocked(true);
                        },
                      },
                    ]
                  );
                }
              }}
              className="flex-row items-center justify-center mt-10 py-3 gap-2"
            >
              <EmojiIcon
                name={isBlocked ? "shield-checkmark-outline" : "ban-outline"}
                size={16}
                color={isBlocked ? design.colors.brand : design.colors.subtle}
              />
              <Text
                className={`text-sm ${isBlocked ? "text-brand" : "text-muted"}`}
              >
                {isBlocked ? t("profileDetail.unblockUser") : t("profileDetail.blockUser")}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
