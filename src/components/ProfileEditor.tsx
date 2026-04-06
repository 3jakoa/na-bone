"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Gender, University, City } from "@/lib/supabase/types";
import { UNIVERSITIES, FACULTIES, CITIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LogOut, Camera, ChevronDown } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { validateFacePhoto } from "@/lib/validateFace";

interface Props {
  profile: Profile;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-dark">{title}</p>
      {children}
    </div>
  );
}

function StyledSelect({ value, onChange, children }: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white/60 border border-gray-200/60 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand/40 pr-9"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

export default function ProfileEditor({ profile }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [bio, setBio] = useState(profile.bio ?? "");
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [university, setUniversity] = useState<University>(profile.university as University);
  const [faculty, setFaculty] = useState(profile.faculty);
  const [city, setCity] = useState<City>(profile.city as City);
  const [photos, setPhotos] = useState<string[]>(profile.photos);
  const [topRestaurants, setTopRestaurants] = useState<string[]>(
    profile.top_restaurants.length > 0 ? profile.top_restaurants : ["", "", ""]
  );
  const [saving, setSaving] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const faceResult = await validateFacePhoto(file);
    if (!faceResult.valid) {
      toast.error(faceResult.error ?? "Neveljavna slika.");
      e.target.value = "";
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Napaka pri nalaganju."); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setPhotos([publicUrl]);
  }

  async function save() {
    if (!name.trim()) { toast.error("Ime je obvezno."); return; }
    if (photos.length === 0) { toast.error("Dodaj profilno fotografijo."); return; }
    if (!bio.trim()) { toast.error("Bio je obvezen."); return; }
    if (topRestaurants.filter((r) => r.trim()).length < 3) { toast.error("Vnesi vse 3 najljubše restavracije."); return; }
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        age: parseInt(age),
        bio: bio.trim() || null,
        gender,
        university,
        faculty,
        city,
        photos,
        top_restaurants: topRestaurants.filter((r) => r.trim()),
      })
      .eq("id", profile.id);

    if (error) toast.error(error.message);
    else { toast.success("Profil posodobljen!"); router.refresh(); }

    setSaving(false);
  }

  return (
    <div className="space-y-4">

      {/* Photo hero */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="relative">
          {photos.length > 0 ? (
            <>
              <img
                src={photos[0]}
                alt=""
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <label className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-brand flex items-center justify-center cursor-pointer shadow-md hover:bg-brand-dark transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </>
          ) : (
            <label className="w-32 h-32 rounded-full border-2 border-dashed border-white/60 bg-white/30 flex flex-col items-center justify-center cursor-pointer hover:bg-white/50 transition-colors gap-1">
              <Camera className="w-7 h-7 text-white/80" />
              <span className="text-xs text-white/70">Dodaj foto</span>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          )}
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-white">{name || "Tvoj profil"}</p>
          <span className="inline-block bg-brand-light/80 text-brand-dark text-xs px-3 py-1 rounded-full font-medium mt-1">
            {faculty || "Dodaj fakulteto"}
          </span>
        </div>
      </div>

      {/* Card 1 — Osebni podatki */}
      <SectionCard title="Osebni podatki">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-gray-600">Ime</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/60 border-gray-200/60 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="age" className="text-sm font-medium text-gray-600">Starost</Label>
          <Input
            id="age"
            type="number"
            min={18}
            max={35}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="bg-white/60 border-gray-200/60 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">Spol</Label>
          <div className="flex gap-2">
            {(["moški", "ženska", "drugo"] as Gender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all capitalize ${
                  gender === g
                    ? "bg-brand text-white border-brand shadow-sm"
                    : "bg-white/60 border-gray-200/60 text-gray-600 hover:border-brand/50"
                }`}
              >
                {g === "moški" ? "Moški" : g === "ženska" ? "Ženska" : "Drugo"}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Card 2 — O meni */}
      <SectionCard title="O meni">
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-sm font-medium text-gray-600">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Povej kaj o sebi — zakaj greš na bone, kaj ti je ful dobro..."
            maxLength={300}
            rows={3}
            className="bg-white/60 border-gray-200/60 rounded-xl resize-none"
          />
          <p className="text-xs text-gray-400 text-right">{bio.length}/300</p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">Top 3 restavracije</Label>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Input
                key={i}
                placeholder={`Restavracija ${i + 1}`}
                value={topRestaurants[i] ?? ""}
                onChange={(e) => {
                  const next = [...topRestaurants];
                  next[i] = e.target.value;
                  setTopRestaurants(next);
                }}
                maxLength={50}
                className="bg-white/60 border-gray-200/60 rounded-xl"
              />
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Card 3 — Lokacija */}
      <SectionCard title="Lokacija">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">Univerza</Label>
          <StyledSelect value={university} onChange={(v) => { setUniversity(v as University); setFaculty(""); }}>
            {UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
          </StyledSelect>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">Fakulteta</Label>
          <StyledSelect value={faculty} onChange={setFaculty}>
            {FACULTIES[university].map((f) => <option key={f} value={f}>{f}</option>)}
          </StyledSelect>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">Mesto</Label>
          <StyledSelect value={city} onChange={(v) => setCity(v as City)}>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </StyledSelect>
        </div>
      </SectionCard>

      {/* Logout card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-4">
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full gap-2 text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Odjava
          </Button>
        </form>
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-[4.5rem] left-0 right-0 px-4 z-40">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={save}
            disabled={saving}
            className="w-full h-12 bg-brand hover:bg-brand-dark text-white font-semibold rounded-2xl shadow-lg"
          >
            {saving ? "Shranjujem..." : "Shrani spremembe"}
          </Button>
        </div>
      </div>

    </div>
  );
}
