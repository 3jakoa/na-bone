import { useState } from "react";
import { View, Text, Pressable, Switch } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Notifications() {
  const [bones, setBones] = useState(true);
  const [matches, setMatches] = useState(true);
  const [messages, setMessages] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-6 pt-16 pb-4">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 ml-3">Obvestila</Text>
      </View>

      <View className="bg-white mx-4 rounded-3xl overflow-hidden shadow-sm">
        <ToggleRow
          icon="restaurant-outline"
          label="Novi boni"
          description="Ko buddy objavi nov bon"
          value={bones}
          onToggle={setBones}
        />
        <Sep />
        <ToggleRow
          icon="heart-outline"
          label="Novi matchi"
          description="Ko dobiš novega buddyja"
          value={matches}
          onToggle={setMatches}
        />
        <Sep />
        <ToggleRow
          icon="chatbubble-outline"
          label="Sporočila"
          description="Nova sporočila od buddyjev"
          value={messages}
          onToggle={setMessages}
        />
        <Sep />
        <ToggleRow
          icon="megaphone-outline"
          label="Novosti"
          description="Novice in posodobitve aplikacije"
          value={marketing}
          onToggle={setMarketing}
        />
      </View>

      <Text className="text-xs text-gray-400 text-center mt-4 px-8">
        Obvestila se shranjujejo lokalno. Push obvestila bodo na voljo kmalu.
      </Text>
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
