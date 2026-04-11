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
import { Ionicons } from "@expo/vector-icons";
import { supabase, type Profile, capitalizeName } from "../lib/supabase";
import { uploadImage } from "../lib/upload";
import { UNIVERSITIES, UNIVERSITY_NAMES } from "../lib/universities";

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
      return Alert.alert("", "Največ 6 slik.");
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
      return Alert.alert("", "Izpolni ime in starost.");
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
      Alert.alert("Napaka", e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const faculties = university ? (UNIVERSITIES[university] ?? []) : [];
  const allPhotos = [...photos, ...newPhotos];

  if (!me) return <View className="flex-1 bg-gray-50 dark:bg-neutral-950" />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-gray-50 dark:bg-neutral-950"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1 bg-gray-50 dark:bg-neutral-950"
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#888" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">Uredi profil</Text>
          <Pressable onPress={save} disabled={loading}>
            <Text className="text-brand font-bold text-base">
              {loading ? "..." : "Shrani"}
            </Text>
          </Pressable>
        </View>

        {/* Photos grid */}
        <View className="bg-white dark:bg-neutral-900 mx-4 rounded-3xl px-5 py-4 shadow-sm">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Slike ({allPhotos.length}/6)
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {allPhotos.map((uri, i) => (
              <View key={i} className="relative">
                <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: 16 }} />
                <Pressable
                  onPress={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 items-center justify-center"
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
                {i === 0 && (
                  <View className="absolute bottom-1 left-1 bg-brand rounded-full px-2 py-0.5">
                    <Text className="text-white text-xs font-semibold">
                      Glavna
                    </Text>
                  </View>
                )}
              </View>
            ))}
            {allPhotos.length < 6 && (
              <Pressable
                onPress={addPhoto}
                className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-neutral-800 items-center justify-center border-2 border-dashed border-gray-300 dark:border-neutral-700"
              >
                <Ionicons name="add" size={28} color="#999" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Basic info */}
        <View className="bg-white dark:bg-neutral-900 mx-4 mt-4 rounded-3xl px-5 py-2 shadow-sm">
          <EditRow label="Ime">
            <TextInput
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
              placeholderTextColor="#888"
              className="flex-1 text-base text-right text-gray-900 dark:text-white"
            />
          </EditRow>
          <View className="h-px bg-gray-100 dark:bg-neutral-800" />
          <View className="py-4">
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">Starost</Text>
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
                      className={`w-11 h-11 rounded-xl items-center justify-center ${age === a ? "bg-brand" : "bg-gray-100 dark:bg-neutral-800"}`}
                    >
                      <Text
                        className={`text-sm font-semibold ${age === a ? "text-white" : "text-gray-700 dark:text-gray-200"}`}
                      >
                        {a}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </ScrollView>
          </View>
          <View className="h-px bg-gray-100 dark:bg-neutral-800" />
          <View className="py-4">
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">Spol</Text>
            <View className="flex-row gap-2">
              {(["moški", "ženska", "drugo"] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  className={`flex-1 py-2.5 rounded-2xl items-center ${gender === g ? "bg-brand" : "bg-gray-100 dark:bg-neutral-800"}`}
                >
                  <Text
                    className={`text-sm font-semibold ${gender === g ? "text-white" : "text-gray-700 dark:text-gray-200"}`}
                  >
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Education level */}
        <View className="bg-white dark:bg-neutral-900 mx-4 mt-4 rounded-3xl px-5 py-4 shadow-sm">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Stopnja študija
          </Text>
          <View className="flex-row gap-2">
            {(
              [
                { key: "dodiplomski", label: "Dodiplomski" },
                { key: "magistrski", label: "Magistrski" },
                { key: "doktorski", label: "Doktorski" },
              ] as const
            ).map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() =>
                  setEducationLevel(educationLevel === key ? "" : key)
                }
                className={`flex-1 py-2.5 rounded-2xl items-center ${educationLevel === key ? "bg-brand" : "bg-gray-100 dark:bg-neutral-800"}`}
              >
                <Text
                  className={`text-xs font-semibold ${educationLevel === key ? "text-white" : "text-gray-700 dark:text-gray-200"}`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* University */}
        <View className="bg-white dark:bg-neutral-900 mx-4 mt-4 rounded-3xl px-5 py-2 shadow-sm">
          <Pressable
            onPress={() => setShowUniPicker(!showUniPicker)}
            className="flex-row items-center justify-between py-4"
          >
            <Text className="text-sm text-gray-500 dark:text-gray-400">Univerza</Text>
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-900 dark:text-white mr-1" numberOfLines={1}>
                {university || "Izberi"}
              </Text>
              <Ionicons
                name={showUniPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color="#999"
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
                  className={`py-3 px-4 rounded-2xl mb-1 ${university === u ? "bg-brand" : "bg-gray-50 dark:bg-neutral-800"}`}
                >
                  <Text
                    className={`text-sm ${university === u ? "text-white font-semibold" : "text-gray-700 dark:text-gray-200"}`}
                  >
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View className="h-px bg-gray-100 dark:bg-neutral-800" />
          <Pressable
            onPress={() => setShowFacPicker(!showFacPicker)}
            className="flex-row items-center justify-between py-4"
          >
            <Text className="text-sm text-gray-500 dark:text-gray-400">Fakulteta</Text>
            <View className="flex-row items-center">
              <Text
                className="text-sm text-gray-900 dark:text-white mr-1 max-w-48"
                numberOfLines={1}
              >
                {faculty || "Izberi"}
              </Text>
              <Ionicons
                name={showFacPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color="#999"
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
                  className={`py-3 px-4 rounded-2xl mb-1 ${faculty === f ? "bg-brand" : "bg-gray-50 dark:bg-neutral-800"}`}
                >
                  <Text
                    className={`text-sm ${faculty === f ? "text-white font-semibold" : "text-gray-700 dark:text-gray-200"}`}
                  >
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Bio */}
        <View className="bg-white dark:bg-neutral-900 mx-4 mt-4 rounded-3xl px-5 py-4 shadow-sm">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Nekaj o sebi..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={300}
            className="text-base text-gray-900 dark:text-white min-h-20 bg-gray-50 dark:bg-neutral-800 rounded-2xl px-4 py-3"
          />
          <Text className="text-xs text-gray-300 dark:text-gray-600 text-right mt-1">
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
      <Text className="text-sm text-gray-500 dark:text-gray-400">{label}</Text>
      {children}
    </View>
  );
}
