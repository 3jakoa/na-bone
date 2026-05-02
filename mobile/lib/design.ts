import { type TextStyle, type ViewStyle } from "react-native";

const colors = {
  brand: "#00A6F6",
  brandDark: "#0080C0",
  brandLight: "#E0F4FE",
  page: "#F5F8FB",
  surface: "#FFFFFF",
  field: "#F7F9FC",
  border: "#DDE3EB",
  divider: "#EDF0F4",
  text: "#111827",
  textSoft: "#374151",
  muted: "#9CA3AF",
  subtle: "#C8D0DA",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  warning: "#D97706",
  warningBg: "#FFFBEB",
  white: "#FFFFFF",
  overlay: "rgba(17, 24, 39, 0.42)",
} as const;

export const design = {
  colors,
  radius: {
    input: 22,
    control: 20,
    button: 24,
    card: 24,
    sheet: 32,
    pill: 999,
  },
  spacing: {
    screenX: 24,
    screenXWide: 28,
  },
  shadow: {
    card: {
      shadowColor: colors.brand,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 1,
    } satisfies ViewStyle,
    button: {
      shadowColor: colors.brand,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 3,
    } satisfies ViewStyle,
  },
  type: {
    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: "800",
      letterSpacing: 0,
      lineHeight: 38,
    } satisfies TextStyle,
    subtitle: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 23,
    } satisfies TextStyle,
    label: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.8,
      textTransform: "uppercase",
    } satisfies TextStyle,
    body: {
      color: colors.textSoft,
      fontSize: 16,
      lineHeight: 23,
    } satisfies TextStyle,
    caption: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
    } satisfies TextStyle,
    button: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "800",
    } satisfies TextStyle,
  },
} as const;
