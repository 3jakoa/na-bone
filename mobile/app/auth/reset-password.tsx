import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, Image } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { completeAuthCallbackFromUrl } from "../../lib/auth";

export default function ResetPassword() {
  const incomingUrl = Linking.useURL();
  const attempted = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    (async () => {
      const url = incomingUrl ?? (await Linking.getInitialURL());
      if (url) {
        const result = await completeAuthCallbackFromUrl(url);
        if (!result.ok) {
          setError(result.error ?? "Povezava za ponastavitev ni veljavna.");
          return;
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setError("Odpri povezavo iz e-maila za ponastavitev gesla.");
          return;
        }
      }

      setReady(true);
    })();
  }, [incomingUrl]);

  async function handleUpdatePassword() {
    if (password.length < 8) {
      return Alert.alert("Napaka", "Geslo mora imeti vsaj 8 znakov.");
    }
    if (password !== confirm) {
      return Alert.alert("Napaka", "Gesli se ne ujemata.");
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      return Alert.alert("Napaka", updateError.message);
    }

    await supabase.auth.signOut();
    setLoading(false);
    Alert.alert("Geslo spremenjeno", "Zdaj se lahko prijaviš z novim geslom.", [
      { text: "OK", onPress: () => router.replace("/auth/login") },
    ]);
  }

  if (!ready) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-neutral-950 justify-center px-6">
        <View className="bg-white dark:bg-neutral-900 rounded-3xl px-5 py-8 shadow-sm items-center">
          {error ? (
            <>
              <Text className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
                Povezava ne deluje
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {error}
              </Text>
              <Pressable
                onPress={() => router.replace("./forgot-password")}
                className="bg-brand rounded-2xl py-4 px-6 items-center"
              >
                <Text className="text-white font-bold">Pošlji novo povezavo</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color="#00A6F6" />
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Preverjam povezavo...
              </Text>
            </>
          )}
        </View>
      </View>
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
          Novo geslo
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 mt-1 text-center">
          Izberi novo geslo za svoj Boni Buddy račun.
        </Text>
      </View>

      <View className="bg-white dark:bg-neutral-900 rounded-3xl px-5 py-6 shadow-sm">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          Novo geslo
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Vsaj 8 znakov"
          placeholderTextColor="#888"
          className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-white mb-4"
        />
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
          Ponovi geslo
        </Text>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="Ponovi novo geslo"
          placeholderTextColor="#888"
          className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl px-4 py-3.5 text-base text-gray-900 dark:text-white mb-6"
        />

        <Pressable
          onPress={handleUpdatePassword}
          disabled={loading}
          className="bg-brand rounded-2xl py-4 items-center"
        >
          <Text className="text-white font-bold text-base">
            {loading ? "Shranjujem..." : "Shrani novo geslo"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
