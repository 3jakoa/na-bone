import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, Image } from "react-native";
import { Link } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getPasswordResetRedirectTo } from "../../lib/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return Alert.alert("Napaka", "Vnesi e-mail naslov za svoj račun.");
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getPasswordResetRedirectTo(),
    });
    setLoading(false);

    if (error) return Alert.alert("Napaka", error.message);

    Alert.alert(
      "Preveri e-mail",
      "Če račun obstaja, smo ti poslali povezavo za nastavitev novega gesla."
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-950 justify-center px-6">
      <View className="items-center mb-10">
        <Image
          source={require("../../assets/logo.png")}
          style={{ width: 96, height: 96, borderRadius: 48 }}
        />
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
          Pozabljeno geslo
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 mt-1 text-center">
          Vnesi e-mail in poslali ti bomo povezavo za novo geslo.
        </Text>
      </View>

      <View className="bg-white dark:bg-neutral-900 rounded-3xl px-5 py-6 shadow-sm">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          E-mail
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="ime@student.uni-lj.si"
          placeholderTextColor="#888"
          className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-white mb-6"
        />

        <Pressable
          onPress={handleReset}
          disabled={loading}
          className="bg-brand rounded-2xl py-4 items-center"
        >
          <Text className="text-white font-bold text-base">
            {loading ? "Pošiljam..." : "Pošlji povezavo"}
          </Text>
        </Pressable>
      </View>

      <Link href="/auth/login" className="text-center text-brand font-semibold mt-6">
        Nazaj na prijavo
      </Link>
    </View>
  );
}
