import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  Alert,
  Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Profile } from "../../lib/supabase";

type Buddy = { matchId: string; profile: Profile };

export default function Buddies() {
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBuddy, setActionBuddy] = useState<Buddy | null>(null);

  const load = useCallback(async () => {
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
    setMeId(me.id);

    const { data: matches } = await supabase
      .from("buddy_matches")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`)
      .order("created_at", { ascending: false });

    const out: Buddy[] = [];
    for (const m of matches ?? []) {
      const otherId = m.user1_id === me.id ? m.user2_id : m.user1_id;
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherId)
        .single();
      if (p) out.push({ matchId: m.id, profile: p as Profile });
    }
    setBuddies(out);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function removeBuddy(buddy: Buddy) {
    setActionBuddy(null);
    Alert.alert(
      "Odstrani buddyja",
      `Ali res želiš odstraniti ${buddy.profile.name}?`,
      [
        { text: "Prekliči", style: "cancel" },
        {
          text: "Odstrani",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("buddy_matches")
              .delete()
              .eq("id", buddy.matchId);
            setBuddies((prev) =>
              prev.filter((b) => b.matchId !== buddy.matchId)
            );
          },
        },
      ]
    );
  }

  function blockUser(buddy: Buddy) {
    setActionBuddy(null);
    Alert.alert(
      "Blokiraj",
      `Ali želiš blokirati ${buddy.profile.name}? Ne bo mogel/la videti tvojih objav ali ti pisati.`,
      [
        { text: "Prekliči", style: "cancel" },
        {
          text: "Blokiraj",
          style: "destructive",
          onPress: async () => {
            if (!meId) return;
            await supabase.from("blocked_users").insert({
              blocker_id: meId,
              blocked_id: buddy.profile.id,
            });
            await supabase
              .from("buddy_matches")
              .delete()
              .eq("id", buddy.matchId);
            setBuddies((prev) =>
              prev.filter((b) => b.matchId !== buddy.matchId)
            );
          },
        },
      ]
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 ml-3">
          Moji buddyji
        </Text>
        <Text className="text-gray-400 text-sm ml-2">({buddies.length})</Text>
      </View>

      <FlatList
        data={buddies}
        keyExtractor={(b) => b.matchId}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        ListEmptyComponent={
          loading ? null : (
            <View className="items-center mt-16">
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text className="text-gray-400 text-lg mt-4">
                Še nimaš buddyjev
              </Text>
              <Text className="text-gray-300 text-sm mt-1">
                Swipaj da jih najdeš!
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/matches/${item.matchId}`)}
            className="bg-white rounded-3xl p-4 flex-row items-center shadow-sm"
          >
            <Pressable
              onPress={() =>
                router.push(`/profile-detail?id=${item.profile.id}`)
              }
            >
              {item.profile.photos[0] ? (
                <Image
                  source={{ uri: item.profile.photos[0] }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              ) : (
                <View
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                  className="bg-brand-light items-center justify-center"
                >
                  <Text className="font-bold text-brand-dark text-lg">
                    {item.profile.name[0]}
                  </Text>
                </View>
              )}
            </Pressable>

            <View className="flex-1 ml-3">
              <Text className="font-bold text-gray-900">
                {item.profile.name}, {item.profile.age}
              </Text>
              <Text className="text-xs text-gray-400">
                {item.profile.faculty}
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => router.push(`/matches/${item.matchId}`)}
                className="w-10 h-10 rounded-full bg-brand-light items-center justify-center"
              >
                <Ionicons name="chatbubble" size={18} color="#00A6F6" />
              </Pressable>
              <Pressable
                onPress={() => setActionBuddy(item)}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color="#999"
                />
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      {/* Custom action modal */}
      <Modal
        visible={!!actionBuddy}
        transparent
        animationType="fade"
        onRequestClose={() => setActionBuddy(null)}
      >
        <Pressable
          onPress={() => setActionBuddy(null)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable
            onPress={() => {}}
            className="bg-white rounded-t-3xl px-5 pt-3 pb-10"
          >
            {/* Handle bar */}
            <View className="w-10 h-1 rounded-full bg-gray-300 self-center mb-5" />

            {actionBuddy && (
              <>
                {/* Header */}
                <View className="flex-row items-center mb-5">
                  {actionBuddy.profile.photos[0] ? (
                    <Image
                      source={{ uri: actionBuddy.profile.photos[0] }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                    />
                  ) : (
                    <View
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                      className="bg-brand-light items-center justify-center"
                    >
                      <Text className="font-bold text-brand-dark">
                        {actionBuddy.profile.name[0]}
                      </Text>
                    </View>
                  )}
                  <View className="ml-3">
                    <Text className="font-bold text-gray-900 text-base">
                      {actionBuddy.profile.name}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {actionBuddy.profile.faculty}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <ActionRow
                  icon="chatbubble-outline"
                  label="Pošlji sporočilo"
                  color="#00A6F6"
                  onPress={() => {
                    setActionBuddy(null);
                    router.push(`/matches/${actionBuddy.matchId}`);
                  }}
                />
                <ActionRow
                  icon="person-outline"
                  label="Poglej profil"
                  color="#00A6F6"
                  onPress={() => {
                    setActionBuddy(null);
                    router.push(
                      `/profile-detail?id=${actionBuddy.profile.id}`
                    );
                  }}
                />
                <ActionRow
                  icon="person-remove-outline"
                  label="Odstrani buddyja"
                  color="#ef4444"
                  onPress={() => removeBuddy(actionBuddy)}
                />
                <ActionRow
                  icon="ban-outline"
                  label="Blokiraj uporabnika"
                  color="#ef4444"
                  onPress={() => blockUser(actionBuddy)}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 px-2 rounded-2xl active:bg-gray-50"
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: color + "15" }}
      >
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text className="ml-3 text-base text-gray-800 font-medium">{label}</Text>
    </Pressable>
  );
}
