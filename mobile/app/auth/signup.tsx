import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { Link, router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { isStudentEmail, signInWithGoogle } from "../../lib/auth";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!isStudentEmail(email)) return Alert.alert("Napaka", "Potrebuješ študentski e-mail.");
    if (password.length < 8) return Alert.alert("Napaka", "Geslo mora imeti vsaj 8 znakov.");
    if (password !== confirm) return Alert.alert("Napaka", "Gesli se ne ujemata.");

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return Alert.alert("Napaka", error.message);
    Alert.alert("Preveri e-mail", "Poslali smo ti potrditveno povezavo.");
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
      <Text className="text-center text-gray-500 mb-8">Registracija</Text>

      <TextInput placeholder="Študentski e-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" className="border border-gray-300 rounded-xl px-4 py-3 mb-3" />
      <TextInput placeholder="Geslo" value={password} onChangeText={setPassword} secureTextEntry className="border border-gray-300 rounded-xl px-4 py-3 mb-3" />
      <TextInput placeholder="Ponovi geslo" value={confirm} onChangeText={setConfirm} secureTextEntry className="border border-gray-300 rounded-xl px-4 py-3 mb-6" />

      <Pressable onPress={handleSignup} disabled={loading} className="bg-brand rounded-full py-3 items-center">
        <Text className="text-white font-semibold">{loading ? "..." : "Registracija"}</Text>
      </Pressable>

      <View className="flex-row items-center my-4">
        <View className="flex-1 h-px bg-gray-200" /><Text className="mx-3 text-xs text-gray-400">ali</Text><View className="flex-1 h-px bg-gray-200" />
      </View>

      <Pressable onPress={handleGoogle} disabled={loading} className="border border-gray-300 rounded-full py-3 items-center">
        <Text className="font-semibold text-gray-700">Nadaljuj z Googlom</Text>
      </Pressable>

      <Link href="/auth/login" className="text-center text-brand mt-6">Že imaš račun? Prijava</Link>
    </View>
  );
}
