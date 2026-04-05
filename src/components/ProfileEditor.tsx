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
import { LogOut, Camera } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { validateFacePhoto } from "@/lib/validateFace";

interface Props {
  profile: Profile;
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
    <div className="space-y-6">
      {/* Photo */}
      <div className="space-y-2">
        <Label>Profilna fotografija</Label>
        <p className="text-xs text-muted-foreground">Selfie ali jasna slika obraza.</p>
        <div className="flex justify-center">
          {photos.length > 0 ? (
            <div className="relative">
              <img src={photos[0]} alt="" className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md" />
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand flex items-center justify-center cursor-pointer shadow hover:bg-brand-dark transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
          ) : (
            <label className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-brand transition-colors">
              <Camera className="w-6 h-6 text-muted-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          )}
        </div>
      </div>

      {/* Basic info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Ime</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="age">Starost</Label>
          <Input id="age" type="number" min={18} max={35} value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Spol</Label>
          <div className="flex gap-2">
            {(["moški", "ženska", "drugo"] as Gender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 py-2 rounded-full border text-sm font-medium transition-colors capitalize ${
                  gender === g ? "bg-brand text-white border-brand" : "border-gray-200 hover:border-brand"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Povej kaj o sebi — zakaj greš na bone, kaj ti je ful dobro..."
            maxLength={300}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
        </div>
        <div className="space-y-2">
          <Label>Top 3 restavracije</Label>
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
            />
          ))}
        </div>
      </div>

      {/* University */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Univerza</Label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            value={university}
            onChange={(e) => { setUniversity(e.target.value as University); setFaculty(""); }}
          >
            {UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Fakulteta</Label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
          >
            {FACULTIES[university].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Mesto</Label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            value={city}
            onChange={(e) => setCity(e.target.value as City)}
          >
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full bg-brand hover:bg-brand-dark">
        {saving ? "Shranjujem..." : "Shrani spremembe"}
      </Button>

      <form action={logoutAction}>
        <Button type="submit" variant="outline" className="w-full gap-2 text-red-500 border-red-200 hover:bg-red-50">
          <LogOut className="w-4 h-4" />
          Odjava
        </Button>
      </form>
    </div>
  );
}
