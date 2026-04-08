import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"moški" | "ženska" | "drugo" | "">("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickPhoto() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!r.canceled) setPhotoUri(r.assets[0].uri);
  }

  async function submit() {
    if (!name || !age || !gender || !university || !faculty || !city) {
      return Alert.alert("Napaka", "Izpolni vsa polja.");
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let photoUrl: string | null = null;
      if (photoUri) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const resp = await fetch(photoUri);
        const blob = await resp.blob();
        const { error: upErr } = await supabase.storage.from("avatars").upload(fileName, blob, {
          contentType: "image/jpeg",
        });
        if (upErr) throw upErr;
        photoUrl = supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
      }

      const { error } = await supabase.from("profiles").insert({
        user_id: user.id,
        name,
        age: parseInt(age, 10),
        gender,
        university,
        faculty,
        city,
        bio: bio || null,
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

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
      <Text className="text-2xl font-bold mb-6">Ustvari profil</Text>

      <Field label="Ime" value={name} onChangeText={setName} />
      <Field label="Starost" value={age} onChangeText={setAge} keyboardType="numeric" />
      <Text className="text-sm font-semibold mt-2 mb-1">Spol</Text>
      <View className="flex-row gap-2 mb-3">
        {(["moški", "ženska", "drugo"] as const).map((g) => (
          <Pressable key={g} onPress={() => setGender(g)} className={`px-4 py-2 rounded-full border ${gender === g ? "bg-brand border-brand" : "border-gray-300"}`}>
            <Text className={gender === g ? "text-white" : "text-gray-700"}>{g}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Univerza" value={university} onChangeText={setUniversity} />
      <Field label="Fakulteta" value={faculty} onChangeText={setFaculty} />
      <Field label="Mesto" value={city} onChangeText={setCity} />
      <Field label="Bio" value={bio} onChangeText={setBio} multiline />

      <Pressable onPress={pickPhoto} className="border border-dashed border-gray-300 rounded-xl py-6 items-center mt-2 mb-4">
        {photoUri ? (
          <Image source={{ uri: photoUri }} className="w-24 h-24 rounded-full" />
        ) : (
          <Text className="text-gray-500">Izberi profilno sliko</Text>
        )}
      </Pressable>

      <Pressable onPress={submit} disabled={loading} className="bg-brand rounded-full py-3 items-center">
        <Text className="text-white font-semibold">{loading ? "..." : "Shrani"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field(props: any) {
  return (
    <>
      <Text className="text-sm font-semibold mt-2 mb-1">{props.label}</Text>
      <TextInput {...props} className="border border-gray-300 rounded-xl px-4 py-3 mb-2" />
    </>
  );
}
