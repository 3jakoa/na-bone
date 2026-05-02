import { useState } from "react";
import { Alert, Pressable } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { signInWithGoogle } from "../../lib/auth";
import { useLanguage } from "../../lib/i18n";
import {
  AuthDivider,
  AuthField,
  AuthFooterText,
  AuthPrimaryButton,
  AuthShell,
  AuthTextButton,
  GoogleButton,
} from "../../components/AuthShell";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return Alert.alert(t("common.error"), error.message);
    router.replace("/");
  }

  async function handleGoogle() {
    setLoading(true);
    const r = await signInWithGoogle();
    setLoading(false);
    if (!r.ok && r.error !== "cancelled") Alert.alert(t("common.error"), r.error ?? "");
    if (r.ok) router.replace("/");
  }

  return (
    <AuthShell
      tagline={t("auth.tagline")}
      footer={
        <Pressable onPress={() => router.push("/auth/signup")}>
          <AuthFooterText
            prompt={t("auth.noAccountPrompt")}
            action={`${t("auth.signupTitle")} ✨`}
          />
        </Pressable>
      }
    >
      <AuthField
        label={t("common.email")}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <AuthField
        label={t("common.password")}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
      />
      <AuthTextButton
        label={`${t("auth.forgotPassword")} 🤔`}
        onPress={() => router.push("/auth/forgot-password")}
      />

      <AuthPrimaryButton
        onPress={handleLogin}
        loading={loading}
        label={`${t("auth.loginButton")} 🚀`}
        loadingLabel={t("auth.loggingIn")}
      />
      <AuthDivider label={t("auth.or")} />
      <GoogleButton
        onPress={handleGoogle}
        loading={loading}
        label={t("auth.continueGoogle")}
      />
    </AuthShell>
  );
}
