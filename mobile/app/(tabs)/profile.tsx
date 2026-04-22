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
  const [pokeCount, setPokeCount] = useState(0);
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
          const { count: pc } = await supabase
            .from("product_events")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", p.id)
            .eq("event_type", "poke_sent");
          setPokeCount(pc ?? 0);

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

  if (!me) return <View className="flex-1 bg-gray-50 dark:bg-neutral-950" />;

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-neutral-950"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="pt-16 px-6 flex-row items-center justify-between mb-4">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white">Profil</Text>
        <Pressable
          onPress={() => router.push("/edit-profile")}
          className="w-10 h-10 rounded-full bg-white dark:bg-neutral-900 shadow-sm items-center justify-center"
        >
          <Ionicons name="pencil" size={18} color="#999" />
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
            <View className="w-32 h-32 rounded-full bg-brand-light dark:bg-neutral-800 items-center justify-center border-4 border-white dark:border-neutral-900 shadow-sm">
              <Text className="text-5xl font-bold text-brand-dark dark:text-brand">
                {me.name[0]}
              </Text>
            </View>
          )}
        </Pressable>
        <Text className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">
          {me.name}, {me.age}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="school-outline" size={14} color="#999" />
          <Text className="text-gray-500 dark:text-gray-400 ml-1">{me.faculty}</Text>
        </View>
        <Text className="text-gray-400 dark:text-gray-500 text-sm">{me.university}</Text>
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
        <View className="flex-1 bg-white dark:bg-neutral-900 rounded-3xl py-4 items-center shadow-sm">
          <Ionicons name="paper-plane-outline" size={20} color="#00A6F6" />
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {pokeCount}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500">Povabila</Text>
        </View>
        <Pressable
          onPress={() => router.push("/settings/buddies")}
          className="flex-1 bg-white dark:bg-neutral-900 rounded-3xl py-4 items-center shadow-sm"
        >
          <Ionicons name="people" size={20} color="#00A6F6" />
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {matchCount}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500">Buddies</Text>
        </Pressable>
      </View>

      {/* Bio */}
      <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl px-5 py-4 shadow-sm mb-4">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          O meni
        </Text>
        <Text className="text-base text-gray-700 dark:text-gray-200 leading-6">
          {me.bio || "Še nisi dodal/a bio-ja. Uredi profil!"}
        </Text>
      </View>

      {/* Photos */}
      {me.photos.length > 0 && (
        <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl px-5 py-4 shadow-sm mb-4">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
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
      <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
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
      <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl overflow-hidden shadow-sm mb-4">
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
        className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl py-4 items-center shadow-sm"
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
      <Text className="text-sm text-gray-400 dark:text-gray-500 ml-3 w-20">{label}</Text>
      <Text className="text-sm text-gray-900 dark:text-gray-100 flex-1 text-right">{value}</Text>
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
      <Ionicons name={icon as any} size={20} color="#888" />
      <Text className="flex-1 ml-3 text-base text-gray-800 dark:text-gray-100">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#888" />
    </Pressable>
  );
}

function Sep() {
  return <View className="h-px bg-gray-100 dark:bg-neutral-800 ml-14" />;
}
