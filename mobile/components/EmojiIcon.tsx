import { Text, type StyleProp, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ORIGINAL_ICON_NAMES = new Set([
  "add",
  "chevron-back",
  "chevron-down",
  "chevron-forward",
  "chevron-up",
  "close",
  "ellipsis-horizontal",
  "ellipsis-vertical",
  "pencil",
  "send",
]);

const ICON_EMOJIS: Record<string, string> = {
  add: "➕",
  "ban-outline": "🚫",
  bug: "🛠️",
  "bug-outline": "🛠️",
  bulb: "💡",
  "bulb-outline": "💡",
  calendar: "📅",
  "calendar-outline": "📅",
  camera: "📷",
  chatbubble: "💬",
  "chatbubble-outline": "💬",
  "chevron-back": "⬅️",
  "chevron-down": "⬇️",
  "chevron-forward": "➡️",
  "chevron-up": "⬆️",
  close: "✖️",
  "document-text-outline": "📄",
  "ellipsis-horizontal": "⚙️",
  "ellipsis-vertical": "⚙️",
  flame: "🔥",
  "flash-outline": "⚡",
  "help-circle-outline": "❓",
  heart: "❤️",
  "heart-outline": "❤️",
  language: "🌐",
  "language-outline": "🌐",
  library: "🏛️",
  "library-outline": "🏛️",
  location: "📍",
  "logo-instagram": "📸",
  "mail-outline": "✉️",
  notifications: "🔔",
  "notifications-outline": "🔔",
  people: "👥",
  "people-outline": "👥",
  person: "👤",
  "person-add-outline": "🫶",
  "person-outline": "👤",
  "person-remove-outline": "👋",
  pencil: "✏️",
  "restaurant-outline": "🍽️",
  "ribbon-outline": "🎓",
  school: "🎓",
  "school-outline": "🎓",
  send: "📨",
  "shield-checkmark-outline": "🛡️",
  "trophy-outline": "🏆",
  "warning-outline": "⚠️",
};

type EmojiIconProps = {
  name?: string;
  emoji?: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function EmojiIcon({
  name,
  emoji,
  size = 20,
  color,
  style,
}: EmojiIconProps) {
  if (!emoji && name && ORIGINAL_ICON_NAMES.has(name)) {
    return (
      <Ionicons
        name={name as any}
        size={size}
        color={color}
        style={style as any}
      />
    );
  }

  const glyph = emoji ?? (name ? ICON_EMOJIS[name] : undefined) ?? "❔";

  return (
    <Text
      allowFontScaling={false}
      style={[
        {
          color,
          fontSize: Math.round(size * 0.9),
          lineHeight: Math.round(size * 1.18),
          minWidth: Math.round(size * 1.1),
          includeFontPadding: false,
          textAlign: "center",
          textAlignVertical: "center",
        },
        style,
      ]}
    >
      {glyph}
    </Text>
  );
}
