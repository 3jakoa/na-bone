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
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, capitalizeName } from "../lib/supabase";
import { uploadImage } from "../lib/upload";
import { UNIVERSITIES, UNIVERSITY_NAMES } from "../lib/universities";

const { width } = Dimensions.get("window");
const STEPS = 5;

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

  function goNext() {
    Keyboard.dismiss();
    if (step === 0 && (!name.trim() || !age || !gender)) {
      return Alert.alert("", "Izpolni ime, starost in spol.");
    }
    if (step === 1 && (!university || !faculty)) {
      return Alert.alert("", "Izberi univerzo in fakulteto.");
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
      } as any);
      if (error) throw error;
      router.replace("/(tabs)/discover");
    } catch (e: any) {
      Alert.alert("Napaka", e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const faculties = university ? (UNIVERSITIES[university] ?? []) : [];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-gray-50">
        {/* Progress bar */}
        <View className="pt-16 px-6 pb-4 bg-gray-50">
          <View className="flex-row items-center mb-2">
            {step > 0 && (
              <Pressable onPress={goBack} className="mr-3">
                <Ionicons name="chevron-back" size={24} color="#333" />
              </Pressable>
            )}
            <View className="flex-1 flex-row gap-2">
              {Array.from({ length: STEPS }).map((_, i) => (
                <View
                  key={i}
                  className={`flex-1 h-1 rounded-full ${i <= step ? "bg-brand" : "bg-gray-200"}`}
                />
              ))}
            </View>
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
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-3xl font-bold text-gray-900 mb-1">
              Kdo si?
            </Text>
            <Text className="text-gray-500 mb-8">Povej nam nekaj o sebi</Text>

            <Text className="text-sm font-semibold text-gray-500 mb-1.5">
              Ime
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tvoje ime"
              autoCapitalize="words"
              returnKeyType="next"
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 mb-4 text-base shadow-sm"
            />

            <Text className="text-sm font-semibold text-gray-500 mb-1.5">
              Starost
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
                      className={`w-12 h-12 rounded-2xl items-center justify-center ${age === a ? "bg-brand" : "bg-white border border-gray-200"}`}
                    >
                      <Text
                        className={`text-base font-semibold ${age === a ? "text-white" : "text-gray-700"}`}
                      >
                        {a}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </ScrollView>

            <Text className="text-sm font-semibold text-gray-500 mb-2">
              Spol
            </Text>
            <View className="flex-row gap-3 mb-8">
              {(["moški", "ženska", "drugo"] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setGender(g)}
                  className={`flex-1 py-3.5 rounded-2xl items-center ${gender === g ? "bg-brand" : "bg-white border border-gray-200"}`}
                >
                  <Text
                    className={`font-semibold ${gender === g ? "text-white" : "text-gray-700"}`}
                  >
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={goNext}
              className="bg-brand rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-bold text-base">Naprej</Text>
            </Pressable>
          </ScrollView>

          {/* Step 2: University & Faculty */}
          <ScrollView
            style={{ width }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-3xl font-bold text-gray-900 mb-1">
              Kje študiraš?
            </Text>
            <Text className="text-gray-500 mb-6">
              Izberi univerzo in fakulteto
            </Text>

            <Text className="text-sm font-semibold text-gray-500 mb-2">
              Univerza
            </Text>
            {UNIVERSITY_NAMES.map((u) => (
              <Pressable
                key={u}
                onPress={() => {
                  setUniversity(u);
                  setFaculty("");
                }}
                className={`py-3.5 px-4 rounded-2xl mb-1.5 ${university === u ? "bg-brand" : "bg-white border border-gray-200"}`}
              >
                <Text
                  className={`text-sm ${university === u ? "text-white font-semibold" : "text-gray-700"}`}
                >
                  {u}
                </Text>
              </Pressable>
            ))}

            {faculties.length > 0 && (
              <>
                <Text className="text-sm font-semibold text-gray-500 mb-2 mt-4">
                  Fakulteta
                </Text>
                {faculties.map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFaculty(f)}
                    className={`py-3.5 px-4 rounded-2xl mb-1.5 ${faculty === f ? "bg-brand" : "bg-white border border-gray-200"}`}
                  >
                    <Text
                      className={`text-sm ${faculty === f ? "text-white font-semibold" : "text-gray-700"}`}
                    >
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}

            <Pressable
              onPress={goNext}
              className="bg-brand rounded-2xl py-4 items-center mt-4"
            >
              <Text className="text-white font-bold text-base">Naprej</Text>
            </Pressable>
          </ScrollView>

          {/* Step 3: Education Level */}
          <View style={{ width }} className="px-6">
            <Text className="text-3xl font-bold text-gray-900 mb-1">
              Stopnja študija
            </Text>
            <Text className="text-gray-500 mb-8">Na kateri stopnji si?</Text>

            {(
              [
                { key: "dodiplomski", label: "Dodiplomski", icon: "school-outline" },
                { key: "magistrski", label: "Magistrski", icon: "ribbon-outline" },
                { key: "doktorski", label: "Doktorski", icon: "trophy-outline" },
              ] as const
            ).map(({ key, label, icon }) => (
              <Pressable
                key={key}
                onPress={() => setEducationLevel(key)}
                className={`flex-row items-center py-4 px-5 rounded-2xl mb-2 ${educationLevel === key ? "bg-brand" : "bg-white border border-gray-200"}`}
              >
                <Ionicons
                  name={icon}
                  size={22}
                  color={educationLevel === key ? "#fff" : "#999"}
                />
                <Text
                  className={`ml-3 text-base font-semibold ${educationLevel === key ? "text-white" : "text-gray-700"}`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={goNext}
              className="bg-brand rounded-2xl py-4 items-center mt-6"
            >
              <Text className="text-white font-bold text-base">Naprej</Text>
            </Pressable>
            <Pressable onPress={goNext} className="py-4 items-center mt-1">
              <Text className="text-gray-400 font-semibold">Preskoči</Text>
            </Pressable>
          </View>

          {/* Step 4: Photo */}
          <View style={{ width }} className="px-6">
            <Text className="text-3xl font-bold text-gray-900 mb-1">
              Dodaj sliko
            </Text>
            <Text className="text-gray-500 mb-8">
              Pokaži se — ni pa obvezno
            </Text>

            <Pressable
              onPress={pickPhoto}
              className="items-center justify-center self-center w-48 h-48 rounded-full bg-white border-2 border-dashed border-gray-300 mb-8 overflow-hidden"
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 192, height: 192, borderRadius: 96 }}
                />
              ) : (
                <View className="items-center">
                  <Ionicons name="camera" size={40} color="#ccc" />
                  <Text className="text-gray-400 text-sm mt-2">
                    Dodaj sliko
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={goNext}
              className="bg-brand rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-bold text-base">Naprej</Text>
            </Pressable>
            <Pressable onPress={goNext} className="py-4 items-center mt-1">
              <Text className="text-gray-400 font-semibold">Preskoči</Text>
            </Pressable>
          </View>

          {/* Step 5: Bio */}
          <ScrollView
            style={{ width }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-3xl font-bold text-gray-900 mb-1">
              Še kaj o tebi?
            </Text>
            <Text className="text-gray-500 mb-8">Kratka bio — opcijsko</Text>

            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="FRI študent, rad jem burek..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
              className="bg-white border border-gray-200 rounded-2xl px-4 py-4 text-base min-h-32 mb-2 shadow-sm"
            />
            <Text className="text-xs text-gray-300 text-right mb-6">
              {bio.length}/300
            </Text>

            <Pressable
              onPress={submit}
              disabled={loading}
              className="bg-brand rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-bold text-base">
                {loading ? "Shranjujem..." : "Začni!"}
              </Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={loading}
              className="py-4 items-center mt-1"
            >
              <Text className="text-gray-400 font-semibold">
                Preskoči bio
              </Text>
            </Pressable>
          </ScrollView>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}
