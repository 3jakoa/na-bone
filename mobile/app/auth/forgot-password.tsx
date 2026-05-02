import { useState } from "react";
import { Alert, Pressable } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getPasswordResetRedirectTo } from "../../lib/auth";
import { useLanguage } from "../../lib/i18n";
import {
  AuthField,
  AuthFooterText,
  AuthPrimaryButton,
  AuthShell,
} from "../../components/AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  async function handleReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return Alert.alert(t("common.error"), t("auth.enterAccountEmail"));
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getPasswordResetRedirectTo(),
    });
    setLoading(false);

    if (error) return Alert.alert(t("common.error"), error.message);

    Alert.alert(
      t("auth.checkEmailTitle"),
      t("auth.checkEmailBody")
    );
  }

  return (
    <AuthShell
      tagline={t("auth.forgotSubtitle")}
      footer={
        <Pressable onPress={() => router.push("/auth/login")}>
          <AuthFooterText action={t("auth.backToLogin")} />
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

      <AuthPrimaryButton
        onPress={handleReset}
        loading={loading}
        label={t("auth.sendLink")}
        loadingLabel={t("auth.sending")}
      />
    </AuthShell>
  );
}
