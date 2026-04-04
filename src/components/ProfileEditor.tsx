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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { LogOut, Camera } from "lucide-react";

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
  const [saving, setSaving] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Napaka pri nalaganju."); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setPhotos((prev) => [...prev, publicUrl].slice(0, 6));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    if (!name.trim()) { toast.error("Ime je obvezno."); return; }
    if (photos.length === 0) { toast.error("Dodaj vsaj eno fotografijo."); return; }
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), age: parseInt(age), bio: bio.trim() || null, gender, university, faculty, city, photos })
      .eq("id", profile.id);

    if (error) toast.error(error.message);
    else { toast.success("Profil posodobljen!"); router.refresh(); }

    setSaving(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Photos */}
      <div className="space-y-2">
        <Label>Fotografije ({photos.length}/6)</Label>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
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
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                  gender === g ? "bg-orange-500 text-white border-orange-500" : "border-gray-200 hover:border-orange-300"
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
            placeholder="Nekaj o sebi..."
            maxLength={300}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
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

      <Button onClick={save} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">
        {saving ? "Shranjujem..." : "Shrani spremembe"}
      </Button>

      <Button variant="outline" onClick={logout} className="w-full gap-2 text-red-500 border-red-200 hover:bg-red-50">
        <LogOut className="w-4 h-4" />
        Odjava
      </Button>
    </div>
  );
}
