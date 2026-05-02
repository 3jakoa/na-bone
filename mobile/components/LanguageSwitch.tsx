import { Pressable, StyleSheet, Text, View } from "react-native";
import { design } from "../lib/design";
import { useLanguage } from "../lib/i18n";

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  const isEnglish = language === "en";

  return (
    <View style={styles.row}>
      <Text
        style={[styles.label, !isEnglish ? styles.labelActive : styles.labelIdle]}
      >
        Slovenščina
      </Text>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isEnglish }}
        accessibilityLabel="Preklop jezika"
        onPress={() => {
          void setLanguage(isEnglish ? "sl" : "en");
        }}
        style={[styles.track, isEnglish ? styles.trackActive : styles.trackIdle]}
      >
        <View
          style={[styles.thumb, { transform: [{ translateX: isEnglish ? 20 : 0 }] }]}
        />
      </Pressable>
      <Text
        style={[styles.label, isEnglish ? styles.labelActive : styles.labelIdle]}
      >
        English
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  labelActive: {
    color: design.colors.textSoft,
  },
  labelIdle: {
    color: design.colors.muted,
  },
  track: {
    height: 28,
    width: 48,
    borderRadius: design.radius.pill,
    padding: 4,
  },
  trackActive: {
    backgroundColor: design.colors.brand,
  },
  trackIdle: {
    backgroundColor: design.colors.border,
  },
  thumb: {
    height: 20,
    width: 20,
    borderRadius: 10,
    backgroundColor: design.colors.white,
    shadowColor: design.colors.brand,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 3,
    elevation: 1,
  },
});
