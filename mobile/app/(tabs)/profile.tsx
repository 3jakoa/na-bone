import { useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Profile } from "../../lib/supabase";

const EDU_LABELS: Record<string, string> = {
  dodiplomski: "Dodiplomski",
  magistrski: "Magistrski",
  doktorski: "Doktorski",
};

export default function ProfileScreen() {
  const [me, setMe] = useState<Profile | null>(null);
  const [boneCount, setBoneCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

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
          const { data: boneData } = await supabase
            .from("meal_invites")
            .select("restaurant, scheduled_at")
            .eq("user_id", p.id);
          const uniqueBones = new Set(
            (boneData ?? []).map(
              (b: any) => `${b.restaurant}|${b.scheduled_at}`
            )
          );
          setBoneCount(uniqueBones.size);

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

  if (!me) return <View className="flex-1 bg-gray-50" />;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="pt-16 px-6 flex-row items-center justify-between mb-4">
        <Text className="text-3xl font-bold text-gray-900">Profil</Text>
        <Pressable
          onPress={() => router.push("/edit-profile")}
          className="w-10 h-10 rounded-full bg-white shadow-sm items-center justify-center"
        >
          <Ionicons name="pencil" size={18} color="#555" />
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
              style={{ width: 128, height: 128, borderRadius: 64, borderWidth: 4, borderColor: "#fff" }}
            />
          ) : (
            <View className="w-32 h-32 rounded-full bg-brand-light items-center justify-center border-4 border-white shadow-sm">
              <Text className="text-5xl font-bold text-brand-dark">
                {me.name[0]}
              </Text>
            </View>
          )}
        </Pressable>
        <Text className="text-2xl font-bold mt-4 text-gray-900">
          {me.name}, {me.age}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="school-outline" size={14} color="#999" />
          <Text className="text-gray-500 ml-1">{me.faculty}</Text>
        </View>
        <Text className="text-gray-400 text-sm">{me.university}</Text>
        {me.education_level && (
          <View className="bg-brand-light rounded-full px-3 py-1 mt-2">
            <Text className="text-brand-dark text-xs font-semibold">
              {EDU_LABELS[me.education_level] ?? me.education_level}
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View className="flex-row mx-4 gap-3 mb-4">
        <View className="flex-1 bg-white rounded-3xl py-4 items-center shadow-sm">
          <Ionicons name="restaurant" size={20} color="#00A6F6" />
          <Text className="text-2xl font-bold text-gray-900 mt-1">
            {boneCount}
          </Text>
          <Text className="text-xs text-gray-400">Boni</Text>
        </View>
        <Pressable
          onPress={() => router.push("/settings/buddies")}
          className="flex-1 bg-white rounded-3xl py-4 items-center shadow-sm"
        >
          <Ionicons name="people" size={20} color="#00A6F6" />
          <Text className="text-2xl font-bold text-gray-900 mt-1">
            {matchCount}
          </Text>
          <Text className="text-xs text-gray-400">Buddies</Text>
        </Pressable>
      </View>

      {/* Bio */}
      <View className="bg-white mx-4 rounded-3xl px-5 py-4 shadow-sm mb-4">
        <Text className="text-sm font-semibold text-gray-500 mb-1.5">
          O meni
        </Text>
        <Text className="text-base text-gray-700 leading-6">
          {me.bio || "Še nisi dodal/a bio-ja. Uredi profil!"}
        </Text>
      </View>

      {/* Photos */}
      {me.photos.length > 0 && (
        <View className="bg-white mx-4 rounded-3xl px-5 py-4 shadow-sm mb-4">
          <Text className="text-sm font-semibold text-gray-500 mb-3">
            Slike
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
      <View className="bg-white mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
        <DetailRow icon="person-outline" label="Spol" value={me.gender} />
        <Sep />
        <DetailRow
          icon="school-outline"
          label="Fakulteta"
          value={me.faculty}
        />
        <Sep />
        <DetailRow
          icon="library-outline"
          label="Univerza"
          value={me.university}
        />
        {me.education_level && (
          <>
            <Sep />
            <DetailRow
              icon="ribbon-outline"
              label="Stopnja"
              value={EDU_LABELS[me.education_level] ?? me.education_level}
            />
          </>
        )}
      </View>

      {/* Settings */}
      <View className="bg-white mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
        <SettingsRow
          icon="notifications-outline"
          label="Obvestila"
          onPress={() => router.push("/settings/notifications")}
        />
        <Sep />
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Zasebnost"
          onPress={() => router.push("/settings/privacy")}
        />
        <Sep />
        <SettingsRow
          icon="ban-outline"
          label="Blokirani uporabniki"
          onPress={() => router.push("/settings/blocked")}
        />
        <Sep />
        <SettingsRow
          icon="help-circle-outline"
          label="Pomoč"
          onPress={() => router.push("/settings/help")}
        />
        <Sep />
        <SettingsRow
          icon="document-text-outline"
          label="Pogoji uporabe"
          onPress={() => router.push("/settings/terms")}
        />
      </View>

      {/* Logout */}
      <Pressable
        onPress={logout}
        className="bg-white mx-4 rounded-3xl py-4 items-center shadow-sm"
      >
        <Text className="text-red-500 font-semibold text-base">Odjava</Text>
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
      <Ionicons name={icon as any} size={18} color="#999" />
      <Text className="text-sm text-gray-400 ml-3 w-20">{label}</Text>
      <Text className="text-sm text-gray-900 flex-1 text-right">{value}</Text>
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
      <Ionicons name={icon as any} size={20} color="#555" />
      <Text className="flex-1 ml-3 text-base text-gray-800">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </Pressable>
  );
}

function Sep() {
  return <View className="h-px bg-gray-100 ml-14" />;
}
