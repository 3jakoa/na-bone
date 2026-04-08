import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { signInWithGoogle } from "../../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return Alert.alert("Napaka", error.message);
    router.replace("/");
  }

  async function handleGoogle() {
    setLoading(true);
    const r = await signInWithGoogle();
    setLoading(false);
    if (!r.ok && r.error !== "cancelled") Alert.alert("Napaka", r.error ?? "");
    if (r.ok) router.replace("/");
  }

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <Text className="text-3xl font-bold text-center text-brand-dark mb-2">Boni Buddy</Text>
      <Text className="text-center text-gray-500 mb-8">Prijava</Text>

      <Text className="text-sm font-semibold text-gray-700 mb-1">E-mail</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
      />
      <Text className="text-sm font-semibold text-gray-700 mb-1">Geslo</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
      />

      <Pressable
        onPress={handleLogin}
        disabled={loading}
        className="bg-brand rounded-full py-3 items-center"
      >
        <Text className="text-white font-semibold">{loading ? "..." : "Prijava"}</Text>
      </Pressable>

      <View className="flex-row items-center my-4">
        <View className="flex-1 h-px bg-gray-200" />
        <Text className="mx-3 text-xs text-gray-400">ali</Text>
        <View className="flex-1 h-px bg-gray-200" />
      </View>

      <Pressable
        onPress={handleGoogle}
        disabled={loading}
        className="border border-gray-300 rounded-full py-3 items-center"
      >
        <Text className="font-semibold text-gray-700">Nadaljuj z Googlom</Text>
      </Pressable>

      <Link href="/auth/signup" className="text-center text-brand mt-6">
        Nimaš računa? Registracija
      </Link>
    </View>
  );
}
