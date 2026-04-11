import { useEffect, useState } from "react";
import { View, Text, Pressable, Switch, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

type Prefs = {
  notif_bones: boolean;
  notif_matches: boolean;
  notif_messages: boolean;
};

export default function Notifications() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [meUserId, setMeUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setMeUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("notif_bones, notif_matches, notif_messages")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setPrefs({
          notif_bones: data.notif_bones ?? true,
          notif_matches: data.notif_matches ?? true,
          notif_messages: data.notif_messages ?? true,
        });
      } else {
        setPrefs({
          notif_bones: true,
          notif_matches: true,
          notif_messages: true,
        });
      }
    })();
  }, []);

  async function update<K extends keyof Prefs>(key: K, value: boolean) {
    if (!prefs || !meUserId) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await supabase
      .from("profiles")
      .update({ [key]: value })
      .eq("user_id", meUserId);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 ml-3">Obvestila</Text>
      </View>

      {!prefs ? (
        <ActivityIndicator color="#00A6F6" className="mt-10" />
      ) : (
        <>
          <View className="bg-white mx-4 rounded-3xl overflow-hidden shadow-sm">
            <ToggleRow
              icon="restaurant-outline"
              label="Novi boni"
              description="Ko buddy objavi nov bon"
              value={prefs.notif_bones}
              onToggle={(v) => update("notif_bones", v)}
            />
            <Sep />
            <ToggleRow
              icon="heart-outline"
              label="Novi matchi"
              description="Ko dobiš novega buddyja"
              value={prefs.notif_matches}
              onToggle={(v) => update("notif_matches", v)}
            />
            <Sep />
            <ToggleRow
              icon="chatbubble-outline"
              label="Sporočila"
              description="Nova sporočila od buddyjev"
              value={prefs.notif_messages}
              onToggle={(v) => update("notif_messages", v)}
            />
          </View>

          <Text className="text-xs text-gray-400 text-center mt-4 px-8">
            Obvestila upravljaš tudi v nastavitvah sistema.
          </Text>
        </>
      )}
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onToggle,
}: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center px-5 py-4">
      <Ionicons name={icon as any} size={20} color="#555" />
      <View className="flex-1 ml-3">
        <Text className="text-base text-gray-800">{label}</Text>
        <Text className="text-xs text-gray-400">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: "#00A6F6", false: "#e5e5e5" }}
      />
    </View>
  );
}

function Sep() {
  return <View className="h-px bg-gray-100 ml-14" />;
}
