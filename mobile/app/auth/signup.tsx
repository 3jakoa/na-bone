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
  GoogleButton,
} from "../../components/AuthShell";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  async function handleSignup() {
    if (password.length < 8) return Alert.alert(t("common.error"), t("auth.passwordTooShort"));
    if (password !== confirm) return Alert.alert(t("common.error"), t("auth.passwordMismatch"));

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
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
        <Pressable onPress={() => router.push("/auth/login")}>
          <AuthFooterText
            prompt={t("auth.hasAccountPrompt")}
            action={`${t("auth.loginTitle")} 🚀`}
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
      <AuthField
        label={t("auth.confirmPassword")}
        value={confirm}
        onChangeText={setConfirm}
        placeholder="••••••••"
        secureTextEntry
      />

      <AuthPrimaryButton
        onPress={handleSignup}
        loading={loading}
        label={`${t("auth.signupButton")} ✨`}
        loadingLabel={t("auth.signingUp")}
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
