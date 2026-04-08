import { useEffect, useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import { router } from "expo-router";
import { supabase, type Profile } from "../../lib/supabase";

export default function ProfileScreen() {
  const [me, setMe] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/auth/login");
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setMe(data as Profile);
    })();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  if (!me) return <View className="flex-1 bg-white" />;

  return (
    <View className="flex-1 bg-white pt-16 px-6 items-center">
      {me.photos[0] ? (
        <Image source={{ uri: me.photos[0] }} className="w-32 h-32 rounded-full" />
      ) : (
        <View className="w-32 h-32 rounded-full bg-brand-light items-center justify-center">
          <Text className="text-4xl font-bold text-brand-dark">{me.name[0]}</Text>
        </View>
      )}
      <Text className="text-2xl font-bold mt-4">{me.name}, {me.age}</Text>
      <Text className="text-gray-500">{me.faculty}</Text>
      <Text className="text-gray-500">{me.city}</Text>
      {me.bio && <Text className="text-center text-gray-700 mt-4">{me.bio}</Text>}

      <Pressable onPress={logout} className="mt-10 border border-gray-300 rounded-full px-6 py-3">
        <Text className="font-semibold text-gray-700">Odjava</Text>
      </Pressable>
    </View>
  );
}
