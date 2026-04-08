import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, Alert } from "react-native";
import { supabase, type Profile } from "../../lib/supabase";

export default function Discover() {
  const [me, setMe] = useState<Profile | null>(null);
  const [deck, setDeck] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: myProfile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setMe(myProfile as Profile);

      const { data: swiped } = await supabase.from("swipes").select("swiped_id").eq("swiper_id", myProfile!.id);
      const exclude = new Set([(myProfile as Profile).id, ...((swiped ?? []).map((s) => s.swiped_id))]);

      const { data: candidates } = await supabase.from("profiles").select("*").eq("is_onboarded", true);
      setDeck(((candidates ?? []) as Profile[]).filter((p) => !exclude.has(p.id)));
    })();
  }, []);

  async function swipe(direction: "left" | "right") {
    if (!me || !deck[idx]) return;
    const target = deck[idx];
    setIdx((i) => i + 1);
    const { error } = await supabase.from("swipes").insert({
      swiper_id: me.id,
      swiped_id: target.id,
      direction,
    });
    if (error) Alert.alert("Napaka", error.message);
  }

  const card = deck[idx];

  return (
    <View className="flex-1 bg-brand-light items-center justify-center p-6">
      {!card ? (
        <Text className="text-gray-700 text-lg">Ni več profilov 👀</Text>
      ) : (
        <View className="bg-white rounded-3xl shadow-lg w-full max-w-sm overflow-hidden">
          {card.photos[0] ? (
            <Image source={{ uri: card.photos[0] }} className="w-full h-96" />
          ) : (
            <View className="w-full h-96 bg-brand-light items-center justify-center">
              <Text className="text-6xl">{card.name[0]}</Text>
            </View>
          )}
          <View className="p-4">
            <Text className="text-xl font-bold">{card.name}, {card.age}</Text>
            <Text className="text-sm text-gray-500">{card.faculty}</Text>
            {card.bio && <Text className="text-sm text-gray-700 mt-2">{card.bio}</Text>}
          </View>
          <View className="flex-row justify-around p-4">
            <Pressable onPress={() => swipe("left")} className="w-14 h-14 rounded-full bg-red-100 items-center justify-center">
              <Text className="text-2xl">✕</Text>
            </Pressable>
            <Pressable onPress={() => swipe("right")} className="w-14 h-14 rounded-full bg-green-100 items-center justify-center">
              <Text className="text-2xl">♥</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
