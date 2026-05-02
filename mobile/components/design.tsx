import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { design } from "../lib/design";

type BaseProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppScreen({ children, style }: BaseProps) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function SurfaceCard({ children, style }: BaseProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenHeader({
  title,
  subtitle,
  left,
  right,
  style,
}: {
  title?: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerRow}>
        <View style={styles.headerSide}>{left}</View>
        {title ? (
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View style={styles.headerTitle} />
        )}
        <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
      </View>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  loading,
  disabled,
  onPress,
  style,
}: {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={[styles.primaryButton, inactive && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={design.colors.white} />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  disabled,
  onPress,
  style,
  textStyle,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.secondaryButton, disabled && styles.disabled, style]}
    >
      <Text style={[styles.secondaryButtonText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  multiline,
  maxLength,
  style,
  inputStyle,
  right,
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  multiline?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  right?: ReactNode;
}) {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={design.colors.subtle}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          maxLength={maxLength}
          textAlignVertical={multiline ? "top" : undefined}
          style={[
            styles.input,
            multiline ? styles.multilineInput : null,
            right ? styles.inputWithRight : null,
            inputStyle,
          ]}
        />
        {right ? <View style={styles.inputRight}>{right}</View> : null}
      </View>
    </View>
  );
}

export function ChoicePill({
  label,
  active,
  onPress,
  style,
  textStyle,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, active && styles.choiceActive, style]}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive, textStyle]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function InfoPill({
  label,
  tone = "neutral",
  style,
}: {
  label: string;
  tone?: "neutral" | "brand" | "danger" | "warning";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.infoPill, toneStyles[tone].pill, style]}>
      <Text style={[styles.infoPillText, toneStyles[tone].text]}>{label}</Text>
    </View>
  );
}

export function AvatarFallback({
  initial,
  size = 56,
  textSize = 18,
}: {
  initial: string;
  size?: number;
  textSize?: number;
}) {
  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.avatarFallbackText, { fontSize: textSize }]}>
        {initial}
      </Text>
    </View>
  );
}

const toneStyles = {
  neutral: {
    pill: { backgroundColor: design.colors.field },
    text: { color: design.colors.muted },
  },
  brand: {
    pill: { backgroundColor: design.colors.brandLight },
    text: { color: design.colors.brandDark },
  },
  danger: {
    pill: { backgroundColor: design.colors.dangerBg },
    text: { color: design.colors.danger },
  },
  warning: {
    pill: { backgroundColor: design.colors.warningBg },
    text: { color: design.colors.warning },
  },
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: design.colors.page,
  },
  card: {
    borderRadius: design.radius.card,
    borderWidth: 1,
    borderColor: design.colors.border,
    backgroundColor: design.colors.surface,
    ...design.shadow.card,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: design.spacing.screenX,
    paddingBottom: 14,
    backgroundColor: design.colors.page,
  },
  headerRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
  },
  headerSide: {
    width: 84,
    minHeight: 40,
    justifyContent: "center",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerTitle: {
    flex: 1,
    color: design.colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  headerSubtitle: {
    color: design.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: design.radius.button,
    backgroundColor: design.colors.brand,
    ...design.shadow.button,
  },
  primaryButtonText: {
    ...design.type.button,
  },
  secondaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: design.colors.muted,
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.7,
  },
  label: {
    ...design.type.label,
    marginBottom: 8,
  },
  inputWrap: {
    position: "relative",
  },
  input: {
    minHeight: 56,
    borderRadius: design.radius.input,
    borderWidth: 1.5,
    borderColor: design.colors.border,
    backgroundColor: design.colors.field,
    color: design.colors.text,
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  inputWithRight: {
    paddingRight: 50,
  },
  multilineInput: {
    minHeight: 120,
    paddingTop: 16,
  },
  inputRight: {
    position: "absolute",
    top: 0,
    right: 10,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  choice: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: design.radius.control,
    borderWidth: 1.5,
    borderColor: design.colors.border,
    backgroundColor: design.colors.field,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  choiceActive: {
    borderColor: design.colors.brand,
    backgroundColor: design.colors.brand,
  },
  choiceText: {
    color: design.colors.textSoft,
    fontSize: 15,
    fontWeight: "700",
  },
  choiceTextActive: {
    color: design.colors.white,
  },
  infoPill: {
    borderRadius: design.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  infoPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: design.colors.brandLight,
  },
  avatarFallbackText: {
    color: design.colors.brandDark,
    fontWeight: "800",
  },
});
