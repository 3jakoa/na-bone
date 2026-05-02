import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { EmojiIcon } from "../components/EmojiIcon";
import { supabase, type Profile, capitalizeName } from "../lib/supabase";
import { uploadImage } from "../lib/upload";
import { UNIVERSITIES, UNIVERSITY_NAMES } from "../lib/universities";
import { getGenderLabel, useLanguage } from "../lib/i18n";
import { design } from "../lib/design";

type EducationLevel = "dodiplomski" | "magistrski" | "doktorski" | "";

export default function EditProfile() {
  const [me, setMe] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"moški" | "ženska" | "drugo" | "">("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("");
  const [bio, setBio] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUniPicker, setShowUniPicker] = useState(false);
  const [showFacPicker, setShowFacPicker] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        const p = data as Profile;
        setMe(p);
        setName(p.name);
        setAge(String(p.age));
        setGender(p.gender);
        setUniversity(p.university);
        setFaculty(p.faculty);
        setEducationLevel((p.education_level as EducationLevel) ?? "");
        setBio(p.bio ?? "");
        setPhotos(p.photos);
      }
    })();
  }, []);

  async function addPhoto() {
    if (photos.length + newPhotos.length >= 6)
      return Alert.alert("", t("profile.maxPhotos"));
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!r.canceled) setNewPhotos((prev) => [...prev, r.assets[0].uri]);
  }

  const [removedUrls, setRemovedUrls] = useState<string[]>([]);

  function removePhoto(idx: number) {
    if (idx < photos.length) {
      setRemovedUrls((prev) => [...prev, photos[idx]]);
      setPhotos((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setNewPhotos((prev) => prev.filter((_, i) => i !== idx - photos.length));
    }
  }

  async function save() {
    if (!me || !name.trim() || !age)
      return Alert.alert("", t("profile.fillNameAge"));
    Keyboard.dismiss();
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const uploadedUrls: string[] = [];
      for (const uri of newPhotos) {
        const url = await uploadImage(uri, user.id);
        uploadedUrls.push(url);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          name: capitalizeName(name.trim()),
          age: parseInt(age, 10),
          gender,
          university,
          faculty,
          education_level: educationLevel || null,
          bio: bio.trim() || null,
          photos: [...photos, ...uploadedUrls],
        })
        .eq("id", me.id);
      if (error) throw error;

      // Delete removed photos from storage
      for (const url of removedUrls) {
        try {
          const path = url.split("/avatars/")[1];
          if (path) {
            await supabase.storage.from("avatars").remove([decodeURIComponent(path)]);
          }
        } catch {}
      }

      router.back();
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const faculties = university ? (UNIVERSITIES[university] ?? []) : [];
  const allPhotos = [...photos, ...newPhotos];

  if (!me) return <View className="flex-1 bg-page" />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-page"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1 bg-page"
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
          <Pressable onPress={() => router.back()}>
            <EmojiIcon name="chevron-back" size={28} color={design.colors.muted} />
          </Pressable>
          <Text className="text-lg font-bold text-ink">{t("profile.edit")}</Text>
          <Pressable onPress={save} disabled={loading}>
            <Text className="text-brand font-bold text-base">
              {loading ? t("common.loadingDots") : t("common.save")}
            </Text>
          </Pressable>
        </View>

        {/* Photos grid */}
        <View className="bg-surface mx-4 rounded-[24px] px-5 py-4 border border-line">
          <Text className="text-sm font-semibold text-muted mb-3">
            {t("profile.photos")} ({allPhotos.length}/6)
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {allPhotos.map((uri, i) => (
              <View key={i} className="relative">
                <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: 16 }} />
                <Pressable
                  onPress={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full items-center justify-center"
                  style={{ backgroundColor: design.colors.danger }}
                >
                  <EmojiIcon name="close" size={14} color={design.colors.white} />
                </Pressable>
                {i === 0 && (
                  <View className="absolute bottom-1 left-1 bg-brand rounded-full px-2 py-0.5">
                    <Text className="text-white text-xs font-semibold">
                      {t("profile.main")}
                    </Text>
                  </View>
                )}
              </View>
            ))}
            {allPhotos.length < 6 && (
              <Pressable
                onPress={addPhoto}
                className="w-24 h-24 rounded-[22px] bg-field items-center justify-center border-2 border-dashed border-line"
              >
                <EmojiIcon name="add" size={28} color={design.colors.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Basic info */}
        <View className="bg-surface mx-4 mt-4 rounded-[24px] px-5 py-2 border border-line">
          <EditRow label={t("onboarding.name")}>
            <TextInput
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
              placeholderTextColor={design.colors.subtle}
              className="flex-1 text-base text-right text-ink"
            />
          </EditRow>
          <View className="h-px bg-field" />
          <View className="py-4">
            <Text className="text-sm text-muted mb-2">{t("onboarding.age")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View className="flex-row gap-2">
                {Array.from({ length: 17 }, (_, i) => String(i + 19)).map(
                  (a) => (
                    <Pressable
                      key={a}
                      onPress={() => setAge(a)}
                      className={`w-11 h-11 rounded-[18px] items-center justify-center ${age === a ? "bg-brand" : "bg-field"}`}
                    >
                      <Text
                        className={`text-sm font-semibold ${age === a ? "text-white" : "text-soft"}`}
                      >
                        {a}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </ScrollView>
          </View>
          <View className="h-px bg-field" />
          <View className="py-4">
            <Text className="text-sm text-muted mb-2">{t("onboarding.gender")}</Text>
            <View className="flex-row gap-2">
              {(["moški", "ženska", "drugo"] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  className={`flex-1 py-2.5 rounded-[22px] items-center ${gender === g ? "bg-brand" : "bg-field"}`}
                >
                  <Text
                    className={`text-sm font-semibold ${gender === g ? "text-white" : "text-soft"}`}
                  >
                    {getGenderLabel(g, t)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Education level */}
        <View className="bg-surface mx-4 mt-4 rounded-[24px] px-5 py-4 border border-line">
          <Text className="text-sm font-semibold text-muted mb-2">
            {t("onboarding.educationTitle")}
          </Text>
          <View className="flex-row gap-2">
            {(
              [
                { key: "dodiplomski", label: t("onboarding.eduUndergrad") },
                { key: "magistrski", label: t("onboarding.eduMasters") },
                { key: "doktorski", label: t("onboarding.eduDoctoral") },
              ] as const
            ).map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() =>
                  setEducationLevel(educationLevel === key ? "" : key)
                }
                className={`flex-1 py-2.5 rounded-[22px] items-center ${educationLevel === key ? "bg-brand" : "bg-field"}`}
              >
                <Text
                  className={`text-xs font-semibold ${educationLevel === key ? "text-white" : "text-soft"}`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* University */}
        <View className="bg-surface mx-4 mt-4 rounded-[24px] px-5 py-2 border border-line">
          <Pressable
            onPress={() => setShowUniPicker(!showUniPicker)}
            className="flex-row items-center justify-between py-4"
          >
            <Text className="text-sm text-muted">{t("onboarding.university")}</Text>
            <View className="flex-row items-center">
              <Text className="text-sm text-ink mr-1" numberOfLines={1}>
                {university || t("common.choose")}
              </Text>
              <EmojiIcon
                name={showUniPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color={design.colors.muted}
              />
            </View>
          </Pressable>
          {showUniPicker && (
            <View className="pb-3">
              {UNIVERSITY_NAMES.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => {
                    setUniversity(u);
                    setFaculty("");
                    setShowUniPicker(false);
                    setShowFacPicker(true);
                  }}
                  className={`py-3 px-4 rounded-[22px] mb-1 ${university === u ? "bg-brand" : "bg-page"}`}
                >
                  <Text
                    className={`text-sm ${university === u ? "text-white font-semibold" : "text-soft"}`}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View className="h-px bg-field" />
          <Pressable
            onPress={() => setShowFacPicker(!showFacPicker)}
            className="flex-row items-center justify-between py-4"
          >
            <Text className="text-sm text-muted">{t("onboarding.faculty")}</Text>
            <View className="flex-row items-center">
              <Text
                className="text-sm text-ink mr-1 max-w-48"
                numberOfLines={1}
              >
                {faculty || t("common.choose")}
              </Text>
              <EmojiIcon
                name={showFacPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color={design.colors.muted}
              />
            </View>
          </Pressable>
          {showFacPicker && faculties.length > 0 && (
            <View className="pb-3">
              {faculties.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => {
                    setFaculty(f);
                    setShowFacPicker(false);
                  }}
                  className={`py-3 px-4 rounded-[22px] mb-1 ${faculty === f ? "bg-brand" : "bg-page"}`}
                >
                  <Text
                    className={`text-sm ${faculty === f ? "text-white font-semibold" : "text-soft"}`}
                  >
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Bio */}
        <View className="bg-surface mx-4 mt-4 rounded-[24px] px-5 py-4 border border-line">
          <Text className="text-sm font-semibold text-muted mb-2">{t("common.bio")}</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder={t("profile.somethingAboutYou")}
            placeholderTextColor={design.colors.subtle}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={300}
            className="text-base text-ink min-h-20 bg-field rounded-[22px] px-4 py-3"
          />
          <Text className="text-xs text-subtle text-right mt-1">
            {bio.length}/300
          </Text>
        </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function EditRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between py-4">
      <Text className="text-sm text-muted">{label}</Text>
      {children}
    </View>
  );
}
