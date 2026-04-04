"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UNIVERSITIES, FACULTIES, CITIES } from "@/lib/constants";
import type { University, City, Gender } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const STEPS = ["Osnovni podatki", "Univerza & Kraj", "Fotografije & Bio"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [university, setUniversity] = useState<University | "">("");
  const [faculty, setFaculty] = useState("");
  const [city, setCity] = useState<City | "">("");
  const [bio, setBio] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const valid = files.slice(0, 6);
    setPhotos(valid);
    setPreviews(valid.map((f) => URL.createObjectURL(f)));
  }

  function nextStep() {
    setError("");
    if (step === 0) {
      if (!name.trim() || !age || !gender) {
        setError("Izpolni vsa polja.");
        return;
      }
      if (parseInt(age) < 18 || parseInt(age) > 35) {
        setError("Starost mora biti med 18 in 35.");
        return;
      }
    }
    if (step === 1) {
      if (!university || !faculty || !city) {
        setError("Izpolni vsa polja.");
        return;
      }
    }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setError("");
    if (photos.length === 0) {
      setError("Dodaj vsaj eno fotografijo.");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Ni prijavljenega uporabnika.");
      setLoading(false);
      return;
    }

    // Upload photos
    const uploadedUrls: string[] = [];
    for (const photo of photos) {
      const ext = photo.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, photo, { upsert: true });

      if (uploadError) {
        setError(`Napaka pri nalaganju fotografije: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      uploadedUrls.push(publicUrl);
    }

    // Create profile
    const { error: insertError } = await supabase.from("profiles").insert({
      user_id: user.id,
      name: name.trim(),
      age: parseInt(age),
      gender: gender as Gender,
      university: university as University,
      faculty,
      city: city as City,
      bio: bio.trim() || null,
      photos: uploadedUrls,
      is_onboarded: true,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/discover");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-rose-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex gap-2 mb-2">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-orange-500" : "bg-gray-200"}`}
              />
            ))}
          </div>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>Korak {step + 1} od {STEPS.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
          )}

          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Ime</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Npr. Anja" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Starost</Label>
                <Input id="age" type="number" min={18} max={35} value={age} onChange={(e) => setAge(e.target.value)} placeholder="22" />
              </div>
              <div className="space-y-2">
                <Label>Spol</Label>
                <div className="flex gap-2">
                  {(["moški", "ženska", "drugo"] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                        gender === g
                          ? "bg-orange-500 text-white border-orange-500"
                          : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="university">Univerza</Label>
                <select
                  id="university"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={university}
                  onChange={(e) => { setUniversity(e.target.value as University); setFaculty(""); }}
                >
                  <option value="">Izberi univerzo...</option>
                  {UNIVERSITIES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              {university && (
                <div className="space-y-2">
                  <Label htmlFor="faculty">Fakulteta</Label>
                  <select
                    id="faculty"
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                  >
                    <option value="">Izberi fakulteto...</option>
                    {FACULTIES[university].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="city">Mesto</Label>
                <select
                  id="city"
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={city}
                  onChange={(e) => setCity(e.target.value as City)}
                >
                  <option value="">Izberi mesto...</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Fotografije (do 6)</Label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 transition-colors">
                  <span className="text-sm text-muted-foreground">Klikni za dodajanje fotografij</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
                </label>
                {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {previews.map((src, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (neobvezno)</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Kaj bi rad/a, da drugi vedo o tebi?"
                  maxLength={300}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
                Nazaj
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={nextStep} className="flex-1 bg-orange-500 hover:bg-orange-600">
                Naprej
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600">
                {loading ? "Shranjujem..." : "Začni iskati 🍽️"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
