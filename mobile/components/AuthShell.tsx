import { useState, type ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import {
  OpenSans_400Regular,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
  OpenSans_800ExtraBold,
} from "@expo-google-fonts/open-sans";
import { LanguageSwitch } from "./LanguageSwitch";

const colors = {
  brand: "#00A6F6",
  text: "#111827",
  muted: "#9CA3AF",
  subtle: "#B0BAC6",
  fieldBg: "#F7F9FC",
  fieldBorder: "#DDE3EB",
  divider: "#EDF0F4",
  page: "#F5F8FB",
  white: "#FFFFFF",
};

type AuthShellProps = {
  children: ReactNode;
  footer: ReactNode;
  tagline: string;
};

export function AuthShell({ children, footer, tagline }: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    OpenSans_400Regular,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
    OpenSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" backgroundColor={colors.page} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <StatusBar style="dark" backgroundColor={colors.page} />
      <View
        style={[
          styles.language,
          { top: Math.max(insets.top + 10, 18) },
        ]}
      >
        <LanguageSwitch />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom + 10, 28),
          },
        ]}
      >
        <View style={styles.brandBlock}>
          <Text style={styles.logoText}>
            <Text style={styles.logoAccent}>BoniBuddy</Text>
          </Text>
          <Text style={styles.tagline}>{tagline}</Text>
        </View>

        <View style={styles.form}>{children}</View>
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type AuthFieldProps = {
  icon?: string;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
};

export function AuthField({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
}: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const isSecure = !!secureTextEntry;

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, focused && styles.labelFocused]}>
        {icon ? `${icon} ` : ""}
        {label}
      </Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C8D0DA"
          secureTextEntry={isSecure && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            focused && styles.inputFocused,
            isSecure && styles.inputSecure,
          ]}
        />
        {isSecure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Skrij geslo" : "Pokaži geslo"}
            onPress={() => setVisible((current) => !current)}
            style={styles.eyeButton}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={focused ? colors.brand : colors.subtle}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type AuthPrimaryButtonProps = {
  label: string;
  loadingLabel: string;
  loading: boolean;
  onPress: () => void;
};

export function AuthPrimaryButton({
  label,
  loadingLabel,
  loading,
  onPress,
}: AuthPrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.primaryButton, loading && styles.disabled]}
    >
      <View style={styles.primaryBase} />
      <Text style={styles.primaryText}>{loading ? loadingLabel : label}</Text>
    </Pressable>
  );
}

export function AuthTextButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.textButton}>
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.divider} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.divider} />
    </View>
  );
}

type GoogleButtonProps = {
  label: string;
  loading: boolean;
  onPress: () => void;
};

export function GoogleButton({ label, loading, onPress }: GoogleButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.googleButton, loading && styles.disabled]}
    >
      <Image
        source={require("../assets/google.png")}
        style={styles.googleLogo}
      />
      <Text style={styles.googleText}>{label}</Text>
    </Pressable>
  );
}

export function AuthFooterText({
  prompt,
  action,
  children,
}: {
  prompt?: string;
  action: string;
  children?: ReactNode;
}) {
  return (
    <Text style={styles.footerText}>
      {prompt ? <Text>{prompt} </Text> : null}
      <Text style={styles.footerLink}>{action}</Text>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.page,
  },
  language: {
    position: "absolute",
    right: 24,
    zIndex: 10,
  },
  content: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 28,
  },
  brandBlock: {
    marginBottom: 44,
  },
  logoText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 48,
    letterSpacing: -1.4,
    lineHeight: 54,
  },
  logoAccent: {
    color: colors.brand,
  },
  tagline: {
    marginTop: 10,
    color: colors.muted,
    fontFamily: "OpenSans_400Regular",
    fontSize: 15,
    lineHeight: 21,
  },
  form: {
    width: "100%",
  },
  fieldWrap: {
    marginBottom: 14,
  },
  label: {
    color: colors.muted,
    fontFamily: "OpenSans_800ExtraBold",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 7,
    textTransform: "uppercase",
  },
  labelFocused: {
    color: colors.brand,
  },
  inputWrap: {
    position: "relative",
  },
  input: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.fieldBg,
    color: colors.text,
    fontFamily: "OpenSans_600SemiBold",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  inputFocused: {
    borderColor: colors.brand,
    backgroundColor: colors.white,
    shadowColor: colors.brand,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inputSecure: {
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    width: "100%",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: colors.brand,
    marginBottom: 16,
    shadowColor: colors.brand,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryBase: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: colors.brand,
  },
  primaryText: {
    color: colors.white,
    fontFamily: "OpenSans_800ExtraBold",
    fontSize: 16,
    letterSpacing: -0.1,
    zIndex: 1,
  },
  textButton: {
    alignSelf: "flex-end",
    marginBottom: 26,
    marginTop: -4,
  },
  textButtonLabel: {
    color: colors.brand,
    fontFamily: "OpenSans_700Bold",
    fontSize: 13,
    lineHeight: 20,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    color: "#C4CAD3",
    fontFamily: "OpenSans_600SemiBold",
    fontSize: 12,
  },
  googleButton: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.white,
    marginBottom: 28,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  googleLogo: {
    width: 18,
    height: 18,
  },
  googleText: {
    color: "#374151",
    fontFamily: "OpenSans_700Bold",
    fontSize: 14,
  },
  footerText: {
    color: colors.subtle,
    fontFamily: "OpenSans_400Regular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  footerLink: {
    color: colors.brand,
    fontFamily: "OpenSans_800ExtraBold",
  },
  disabled: {
    opacity: 0.7,
  },
});
