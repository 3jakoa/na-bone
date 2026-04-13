import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, Image } from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { signInWithGoogle } from "../../lib/auth";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (password.length < 8) return Alert.alert("Napaka", "Geslo mora imeti vsaj 8 znakov.");
    if (password !== confirm) return Alert.alert("Napaka", "Gesli se ne ujemata.");

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
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
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950 justify-center px-6">
      <View className="items-center mb-10">
        <Image
          source={require("../../assets/logo.png")}
          style={{ width: 96, height: 96, borderRadius: 48 }}
        />
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mt-4">Boni Buddy</Text>
        <Text className="text-gray-500 dark:text-gray-400 mt-1">Registracija</Text>
      </View>

      <View className="bg-white dark:bg-neutral-900 rounded-3xl px-5 py-6 shadow-sm">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1.5">E-mail</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="ime@student.uni-lj.si"
          placeholderTextColor="#888"
          className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-white mb-4"
        />
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Geslo</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Geslo"
          placeholderTextColor="#888"
          className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-white mb-4"
        />
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Ponovi geslo</Text>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="Ponovi geslo"
          placeholderTextColor="#888"
          className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-white mb-6"
        />

        <Pressable
          onPress={handleSignup}
          disabled={loading}
          className="bg-brand rounded-2xl py-4 items-center"
        >
          <Text className="text-white font-bold text-base">
            {loading ? "..." : "Registracija"}
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center my-6 px-4">
        <View className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
        <Text className="mx-4 text-xs text-gray-400 dark:text-gray-500">ali</Text>
        <View className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
      </View>

      <Pressable
        onPress={handleGoogle}
        disabled={loading}
        className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl py-4 items-center shadow-sm"
      >
        <View className="flex-row items-center gap-2">
          <Image source={require("../../assets/google.png")} style={{ width: 20, height: 20 }} />
          <Text className="font-semibold text-gray-700 dark:text-gray-100">Nadaljuj z Googlom</Text>
        </View>
      </Pressable>

      <Link href="/auth/login" className="text-center text-brand font-semibold mt-6">
        Že imaš račun? Prijava
      </Link>
    </View>
  );
}
