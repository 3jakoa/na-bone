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
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Profile } from "../lib/supabase";

const { width } = Dimensions.get("window");

const EDU_LABELS: Record<string, string> = {
  dodiplomski: "Dodiplomski",
  magistrski: "Magistrski",
  doktorski: "Doktorski",
};

export default function ProfileDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [meId, setMeId] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

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

  if (!profile) return <View className="flex-1 bg-gray-50 dark:bg-neutral-950" />;

  const photos = profile.photos.length > 0 ? profile.photos : [];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950">
      <View className="absolute top-0 left-0 right-0 z-20 flex-row items-center justify-between px-5 pt-16 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/30 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
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
                    className={`w-2 h-2 rounded-full ${i === photoIdx ? "bg-brand" : "bg-gray-300 dark:bg-neutral-700"}`}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View
            style={{ width, height: width }}
            className="bg-brand-light dark:bg-neutral-800 items-center justify-center"
          >
            <Text className="text-8xl font-bold text-brand-dark dark:text-brand">
              {profile.name[0]}
            </Text>
          </View>
        )}

        <View className="px-6 pt-6 pb-10">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            {profile.name}, {profile.age}
          </Text>

          <View className="flex-row items-center mt-2">
            <Ionicons name="school-outline" size={16} color="#999" />
            <Text className="text-base text-gray-500 dark:text-gray-400 ml-1.5">
              {profile.faculty}
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Ionicons name="library-outline" size={16} color="#999" />
            <Text className="text-sm text-gray-400 dark:text-gray-500 ml-1.5">
              {profile.university}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2 mt-3">
            <View className="bg-gray-100 dark:bg-neutral-800 rounded-full px-3 py-1.5">
              <Text className="text-sm text-gray-600 dark:text-gray-200">{profile.gender}</Text>
            </View>
            {profile.education_level && (
              <View className="bg-brand-light dark:bg-brand/20 rounded-full px-3 py-1.5">
                <Text className="text-sm text-brand-dark dark:text-brand font-semibold">
                  {EDU_LABELS[profile.education_level] ??
                    profile.education_level}
                </Text>
              </View>
            )}
          </View>

          {profile.bio && (
            <View className="mt-5">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                O meni
              </Text>
              <Text className="text-base text-gray-700 dark:text-gray-200 leading-6">
                {profile.bio}
              </Text>
            </View>
          )}

          {meId && meId !== profile.id && (
            <Pressable
              onPress={() => {
                if (isBlocked) {
                  Alert.alert(
                    "Odblokiraj",
                    `Ali želiš odblokirati ${profile.name}?`,
                    [
                      { text: "Prekliči", style: "cancel" },
                      {
                        text: "Odblokiraj",
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
                    "Blokiraj",
                    `Ali želiš blokirati ${profile.name}? Ne bo mogel/la videti tvojih objav ali ti pisati.`,
                    [
                      { text: "Prekliči", style: "cancel" },
                      {
                        text: "Blokiraj",
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
              <Ionicons
                name={isBlocked ? "shield-checkmark-outline" : "ban-outline"}
                size={16}
                color={isBlocked ? "#00A6F6" : "#aaa"}
              />
              <Text
                className={`text-sm ${isBlocked ? "text-brand" : "text-gray-400 dark:text-gray-500"}`}
              >
                {isBlocked ? "Odblokiraj uporabnika" : "Blokiraj uporabnika"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
