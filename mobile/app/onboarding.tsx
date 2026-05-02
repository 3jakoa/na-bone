import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { EmojiIcon } from "../components/EmojiIcon";
import { supabase, capitalizeName } from "../lib/supabase";
import { uploadImage } from "../lib/upload";
import { UNIVERSITIES, UNIVERSITY_NAMES } from "../lib/universities";
import { getPendingBuddyInviteToken } from "../lib/buddyInvites";
import { useLanguage } from "../lib/i18n";
import { LanguageSwitch } from "../components/LanguageSwitch";

const { width } = Dimensions.get("window");
const STEPS = 5;
const BRAND = "#00A6F6";
const PAGE_BG = "#F5F8FB";
const TEXT = "#111827";
const MUTED = "#9CA3AF";
const FIELD_BG = "#F7F9FC";
const FIELD_BORDER = "#DDE3EB";

type EducationLevel = "dodiplomski" | "magistrski" | "doktorski" | "";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"moški" | "ženska" | "drugo" | "">("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("");
  const [bio, setBio] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { language, t } = useLanguage();

  function goNext() {
    Keyboard.dismiss();
    if (step === 0 && (!name.trim() || !age || !gender)) {
      return Alert.alert("", t("onboarding.requiredBasics"));
    }
    if (step === 1 && (!university || !faculty)) {
      return Alert.alert("", t("onboarding.requiredSchool"));
    }
    const next = Math.min(step + 1, STEPS - 1);
    setStep(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  }

  function goBack() {
    Keyboard.dismiss();
    const prev = Math.max(step - 1, 0);
    setStep(prev);
    scrollRef.current?.scrollTo({ x: prev * width, animated: true });
  }

  async function pickPhoto() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!r.canceled) setPhotoUri(r.assets[0].uri);
  }

  async function submit() {
    Keyboard.dismiss();
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadImage(photoUri, user.id);
      }

      const { error } = await supabase.from("profiles").insert({
        user_id: user.id,
        name: capitalizeName(name.trim()),
        age: parseInt(age, 10),
        gender,
        university,
        faculty,
        city: "",
        education_level: educationLevel || null,
        bio: bio.trim() || null,
        photos: photoUrl ? [photoUrl] : [],
        is_onboarded: true,
        preferred_language: language,
      } as any);
      if (error) throw error;
      const pendingInviteToken = await getPendingBuddyInviteToken();
      if (pendingInviteToken) {
        return router.replace(`/invite/${pendingInviteToken}` as any);
      }
      router.replace("/(tabs)/feed");
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const faculties = university ? (UNIVERSITIES[university] ?? []) : [];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.screen}>
        {/* Progress bar */}
        <View style={styles.header}>
          <View className="flex-row justify-end mb-4">
            <LanguageSwitch />
          </View>
          <View className="flex-row items-center mb-2">
            {step > 0 && (
              <Pressable onPress={goBack} className="mr-3">
                <EmojiIcon name="chevron-back" size={24} color={MUTED} />
              </Pressable>
            )}
            <View className="flex-1 flex-row gap-2">
              {Array.from({ length: STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressSegment,
                    i <= step && styles.progressSegmentActive,
                  ]}
                />
              ))}
            </View>
            <Pressable
              onPress={() => {
                Alert.alert(
                  t("common.logout"),
                  t("onboarding.logoutPrompt"),
                  [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("common.logout"),
                      style: "destructive",
                      onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace("/auth/login");
                      },
                    },
                  ]
                );
              }}
              className="ml-3"
              hitSlop={10}
            >
              <Text style={styles.logoutText}>
                {t("common.logout")}
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1: Name, Age, Gender */}
          <ScrollView
            style={{ width }}
            contentContainerStyle={styles.stepContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.stepTitle}>
              {t("onboarding.stepWhoTitle")}
            </Text>
            <Text style={styles.stepSubtitle}>{t("onboarding.stepWhoSubtitle")}</Text>

            <Text style={styles.label}>
              {t("onboarding.name")}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("onboarding.namePlaceholder")}
              placeholderTextColor="#888"
              autoCapitalize="words"
              returnKeyType="next"
              style={styles.input}
            />

            <Text style={styles.label}>
              {t("onboarding.age")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              className="mb-4"
            >
              <View className="flex-row gap-2">
                {Array.from({ length: 17 }, (_, i) => String(i + 19)).map(
                  (a) => (
                    <Pressable
                      key={a}
                      onPress={() => setAge(a)}
                      style={[
                        styles.ageButton,
                        age === a && styles.optionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          age === a && styles.optionTextActive,
                        ]}
                      >
                        {a}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </ScrollView>

            <Text style={styles.label}>
              {t("onboarding.gender")}
            </Text>
            <View className="flex-row gap-3 mb-8">
              {(["moški", "ženska", "drugo"] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  style={[
                    styles.segmentButton,
                    gender === g && styles.optionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      gender === g && styles.optionTextActive,
                    ]}
                  >
                    {g === "moški"
                      ? t("onboarding.genderMale")
                      : g === "ženska"
                        ? t("onboarding.genderFemale")
                        : t("onboarding.genderOther")}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={goNext}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{t("common.next")}</Text>
            </Pressable>
          </ScrollView>

          {/* Step 2: University & Faculty */}
          <ScrollView
            style={{ width }}
            contentContainerStyle={styles.stepContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.stepTitle}>
              {t("onboarding.schoolTitle")}
            </Text>
            <Text style={styles.stepSubtitle}>
              {t("onboarding.schoolSubtitle")}
            </Text>

            <Text style={styles.label}>
              {t("onboarding.university")}
            </Text>
            {UNIVERSITY_NAMES.map((u) => (
              <Pressable
                key={u}
                onPress={() => {
                  setUniversity(u);
                  setFaculty("");
                }}
                style={[
                  styles.listOption,
                  university === u && styles.optionActive,
                ]}
              >
                <Text
                  style={[
                    styles.listOptionText,
                    university === u && styles.optionTextActive,
                  ]}
                >
                  {u}
                </Text>
              </Pressable>
            ))}

            {faculties.length > 0 && (
              <>
                <Text style={[styles.label, styles.facultyLabel]}>
                  {t("onboarding.faculty")}
                </Text>
                {faculties.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFaculty(f)}
                    style={[
                      styles.listOption,
                      faculty === f && styles.optionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.listOptionText,
                        faculty === f && styles.optionTextActive,
                      ]}
                    >
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}

            <Pressable
              onPress={goNext}
              style={[styles.primaryButton, styles.buttonTop]}
            >
              <Text style={styles.primaryButtonText}>{t("common.next")}</Text>
            </Pressable>
          </ScrollView>

          {/* Step 3: Education Level */}
          <View style={[styles.stepContent, { width }]}>
            <Text style={styles.stepTitle}>
              {t("onboarding.educationTitle")}
            </Text>
            <Text style={styles.stepSubtitle}>{t("onboarding.educationSubtitle")}</Text>

            {(
              [
                { key: "dodiplomski", label: t("onboarding.eduUndergrad"), icon: "school-outline" },
                { key: "magistrski", label: t("onboarding.eduMasters"), icon: "ribbon-outline" },
                { key: "doktorski", label: t("onboarding.eduDoctoral"), icon: "trophy-outline" },
              ] as const
            ).map(({ key, label, icon }) => (
              <Pressable
                key={key}
                onPress={() => setEducationLevel(key)}
                style={[
                  styles.iconOption,
                  educationLevel === key && styles.optionActive,
                ]}
              >
                <EmojiIcon
                  name={icon}
                  size={22}
                  color={educationLevel === key ? "#fff" : MUTED}
                />
                <Text
                  style={[
                    styles.iconOptionText,
                    educationLevel === key && styles.optionTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={goNext}
              style={[styles.primaryButton, styles.buttonTopLarge]}
            >
              <Text style={styles.primaryButtonText}>{t("common.next")}</Text>
            </Pressable>
            <Pressable onPress={goNext} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t("common.skip")}</Text>
            </Pressable>
          </View>

          {/* Step 4: Photo */}
          <View style={[styles.stepContent, { width }]}>
            <Text style={styles.stepTitle}>
              {t("onboarding.photoTitle")}
            </Text>
            <Text style={styles.stepSubtitle}>
              {t("onboarding.photoSubtitle")}
            </Text>

            <Pressable
              onPress={pickPhoto}
              style={styles.photoPicker}
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 192, height: 192, borderRadius: 96 }}
                />
              ) : (
                <View className="items-center">
                  <EmojiIcon name="camera" size={40} color={MUTED} />
                  <Text style={styles.photoPickerText}>
                    {t("onboarding.addPhoto")}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={goNext}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{t("common.next")}</Text>
            </Pressable>
            <Pressable onPress={goNext} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t("common.skip")}</Text>
            </Pressable>
          </View>

          {/* Step 5: Bio */}
          <ScrollView
            style={{ width }}
            contentContainerStyle={styles.stepContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.stepTitle}>
              {t("onboarding.aboutTitle")}
            </Text>
            <Text style={styles.stepSubtitle}>{t("onboarding.aboutSubtitle")}</Text>

            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder={t("onboarding.bioPlaceholder")}
              placeholderTextColor="#888"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
              style={[styles.input, styles.bioInput]}
            />
            <Text style={styles.counterText}>
              {bio.length}/300
            </Text>

            <Pressable
              onPress={submit}
              disabled={loading}
              style={[styles.primaryButton, loading && styles.disabled]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? t("common.saving") : t("onboarding.start")}
              </Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={loading}
              style={[styles.secondaryButton, loading && styles.disabled]}
            >
              <Text style={styles.secondaryButtonText}>
                {t("onboarding.skipBio")}
              </Text>
            </Pressable>
          </ScrollView>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 24,
    paddingBottom: 18,
    backgroundColor: PAGE_BG,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#DDE3EB",
  },
  progressSegmentActive: {
    backgroundColor: BRAND,
  },
  logoutText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  stepContent: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  stepTitle: {
    color: TEXT,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 38,
    marginBottom: 8,
  },
  stepSubtitle: {
    color: MUTED,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 32,
  },
  label: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BG,
    color: TEXT,
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 18,
  },
  bioInput: {
    minHeight: 140,
    paddingTop: 16,
    marginBottom: 8,
  },
  counterText: {
    color: "#C8D0DA",
    fontSize: 12,
    textAlign: "right",
    marginBottom: 24,
  },
  ageButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BG,
  },
  segmentButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BG,
  },
  listOption: {
    minHeight: 52,
    borderRadius: 16,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BG,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  listOptionText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  facultyLabel: {
    marginTop: 18,
  },
  iconOption: {
    minHeight: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BG,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  iconOptionText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 12,
  },
  optionActive: {
    borderColor: BRAND,
    backgroundColor: BRAND,
  },
  optionText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
  },
  optionTextActive: {
    color: "#FFFFFF",
  },
  photoPicker: {
    alignSelf: "center",
    width: 192,
    height: 192,
    borderRadius: 96,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BG,
    marginBottom: 32,
  },
  photoPickerText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  primaryButton: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  secondaryButtonText: {
    color: MUTED,
    fontSize: 15,
    fontWeight: "700",
  },
  buttonTop: {
    marginTop: 18,
  },
  buttonTopLarge: {
    marginTop: 24,
  },
  disabled: {
    opacity: 0.7,
  },
});
