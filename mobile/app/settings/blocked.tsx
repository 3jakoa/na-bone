import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Profile } from "../../lib/supabase";

type BlockedUser = { id: string; profile: Profile };

export default function BlockedUsers() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: me } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (!me) return;

        const { data: blocks } = await supabase
          .from("blocked_users")
          .select("id, blocked_id")
          .eq("blocker_id", me.id)
          .order("created_at", { ascending: false });

        const out: BlockedUser[] = [];
        for (const b of blocks ?? []) {
          const { data: p } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", b.blocked_id)
            .single();
          if (p) out.push({ id: b.id, profile: p as Profile });
        }
        setBlocked(out);
        setLoading(false);
      })();
    }, [])
  );

  async function unblock(item: BlockedUser) {
    Alert.alert("Odblokiraj", `Ali želiš odblokirati ${item.profile.name}?`, [
      { text: "Prekliči", style: "cancel" },
      {
        text: "Odblokiraj",
        onPress: async () => {
          await supabase.from("blocked_users").delete().eq("id", item.id);
          setBlocked((prev) => prev.filter((b) => b.id !== item.id));
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 ml-3">
          Blokirani uporabniki
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#00A6F6" className="mt-10" />
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Ionicons name="shield-checkmark-outline" size={48} color="#ccc" />
              <Text className="text-gray-400 text-lg mt-4">
                Ni blokiranih uporabnikov
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="bg-white rounded-3xl p-4 flex-row items-center shadow-sm">
              <Pressable
                onPress={() =>
                  router.push(`/profile-detail?id=${item.profile.id}`)
                }
              >
                {item.profile.photos[0] ? (
                  <Image
                    source={{ uri: item.profile.photos[0] }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                  />
                ) : (
                  <View
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    className="bg-brand-light items-center justify-center"
                  >
                    <Text className="font-bold text-brand-dark">
                      {item.profile.name[0]}
                    </Text>
                  </View>
                )}
              </Pressable>
              <View className="flex-1 ml-3">
                <Text className="font-bold text-gray-900">
                  {item.profile.name}
                </Text>
                <Text className="text-xs text-gray-400">
                  {item.profile.faculty}
                </Text>
              </View>
              <Pressable
                onPress={() => unblock(item)}
                className="bg-gray-100 rounded-full px-4 py-2"
              >
                <Text className="text-sm font-semibold text-gray-600">
                  Odblokiraj
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
