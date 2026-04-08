import { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { supabase, type Message, type Profile, type Bone } from "../../lib/supabase";

export default function Chat() {
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const [me, setMe] = useState<Profile | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeBone, setActiveBone] = useState<Bone | null>(null);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!matchId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: myP } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setMe(myP as Profile);

      const { data: m } = await supabase.from("matches").select("*").eq("id", matchId).single();
      if (!m) return;
      const otherId = m.user1_id === (myP as Profile).id ? m.user2_id : m.user1_id;
      const { data: o } = await supabase.from("profiles").select("*").eq("id", otherId).single();
      setOther(o as Profile);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);

      const { data: bone } = await supabase
        .from("bones")
        .select("*")
        .eq("match_id", matchId)
        .in("status", ["open", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveBone((bone as Bone) ?? null);
    })();

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (payload) => {
        setMessages((prev) => prev.find((m) => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  async function send() {
    if (!text.trim() || !me) return;
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: me.id,
      content,
    });
    if (error) Alert.alert("Napaka", error.message);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 px-4 pt-12 pb-3 border-b border-gray-100">
        <Pressable onPress={() => router.back()}><Text className="text-brand text-base">‹</Text></Pressable>
        <Text className="font-bold text-lg flex-1">{other?.name ?? ""}</Text>
      </View>

      {activeBone && (
        <View className="bg-brand-light mx-4 mt-2 p-3 rounded-2xl">
          <Text className="font-semibold text-brand-dark">🍽️ {activeBone.restaurant}</Text>
          <Text className="text-xs text-brand-dark">{new Date(activeBone.scheduled_at).toLocaleString("sl-SI")}</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12, gap: 6 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = me && item.sender_id === me.id;
          return (
            <View className={`max-w-[78%] px-3 py-2 rounded-2xl ${mine ? "self-end bg-brand" : "self-start bg-gray-100"}`}>
              <Text className={mine ? "text-white" : "text-gray-900"}>{item.content}</Text>
            </View>
          );
        }}
      />

      <View className="flex-row items-center gap-2 px-4 py-3 border-t border-gray-100">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Sporočilo..."
          className="flex-1 border border-gray-300 rounded-full px-4 py-2"
        />
        <Pressable onPress={send} className="bg-brand rounded-full px-4 py-2">
          <Text className="text-white font-semibold">→</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
