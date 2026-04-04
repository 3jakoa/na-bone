"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import { X, Heart, GraduationCap, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  profiles: Profile[];
  myProfileId: string;
}

export default function SwipeDeck({ profiles, myProfileId }: Props) {
  const router = useRouter();
  const [queue, setQueue] = useState<Profile[]>(profiles);
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);

  const profile = queue[current];

  async function swipe(direction: "left" | "right") {
    if (!profile) return;

    const supabase = createClient();
    const { error, data } = await supabase
      .from("swipes")
      .insert({ swiper_id: myProfileId, swiped_id: profile.id, direction })
      .select()
      .single();

    if (error) {
      toast.error("Napaka pri swipu.");
      return;
    }

    if (direction === "right") {
      // Check if a match was created
      const { data: match } = await supabase
        .from("matches")
        .select("id")
        .or(
          `and(user1_id.eq.${myProfileId},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${myProfileId})`
        )
        .maybeSingle();

      if (match) {
        toast.success(`Match z ${profile.name}! 🎉`, {
          action: { label: "Odpri chat", onClick: () => router.push(`/matches/${match.id}`) },
        });
      }
    }

    setPhotoIndex(0);
    setCurrent((c) => c + 1);
    setDragX(0);
    setDragY(0);
  }

  function onPointerDown(e: React.PointerEvent) {
    setDragging(true);
    startX.current = e.clientX;
    startY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startX.current);
    setDragY(e.clientY - startY.current);
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > 80) swipe("right");
    else if (dragX < -80) swipe("left");
    else { setDragX(0); setDragY(0); }
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
        <div className="text-5xl">🍽️</div>
        <h2 className="text-xl font-semibold">Ni več profilov</h2>
        <p className="text-muted-foreground text-sm">
          V tvojem mestu ni več novih profilov. Preveri jutri!
        </p>
      </div>
    );
  }

  const rotation = (dragX / 300) * 15;
  const likeOpacity = Math.min(dragX / 80, 1);
  const nopeOpacity = Math.min(-dragX / 80, 1);

  return (
    <div className="flex flex-col items-center justify-between min-h-screen pb-6 pt-4 px-4">
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between py-2">
        <h1 className="text-xl font-bold text-orange-500">Na Bone 🍽️</h1>
        <span className="text-sm text-muted-foreground">{profile.city}</span>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm select-none">
        {/* Next card (peek) */}
        {queue[current + 1] && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-lg scale-95 opacity-60"
            style={{ zIndex: 0 }}>
            <img
              src={queue[current + 1].photos[0]}
              alt=""
              className="w-full h-full object-cover"
              style={{ aspectRatio: "3/4" }}
            />
          </div>
        )}

        {/* Active card */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing"
          style={{
            zIndex: 1,
            transform: `translateX(${dragX}px) translateY(${dragY * 0.3}px) rotate(${rotation}deg)`,
            transition: dragging ? "none" : "transform 0.3s ease",
            aspectRatio: "3/4",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Photo */}
          <div className="relative w-full h-full">
            <img
              src={profile.photos[photoIndex] || "/placeholder.png"}
              alt={profile.name}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Photo navigation dots */}
            {profile.photos.length > 1 && (
              <div className="absolute top-3 left-0 right-0 flex gap-1 px-3">
                {profile.photos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i === photoIndex ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            )}

            {/* Photo tap zones */}
            <div className="absolute inset-0 flex">
              <div className="flex-1" onClick={() => setPhotoIndex((p) => Math.max(0, p - 1))} />
              <div className="flex-1" onClick={() => setPhotoIndex((p) => Math.min(profile.photos.length - 1, p + 1))} />
            </div>

            {/* Like / Nope overlays */}
            <div className="absolute top-8 left-6 rotate-[-20deg] border-4 border-green-400 rounded-lg px-3 py-1"
              style={{ opacity: likeOpacity }}>
              <span className="text-green-400 font-bold text-2xl">LIKE</span>
            </div>
            <div className="absolute top-8 right-6 rotate-[20deg] border-4 border-red-400 rounded-lg px-3 py-1"
              style={{ opacity: nopeOpacity }}>
              <span className="text-red-400 font-bold text-2xl">NOPE</span>
            </div>

            {/* Info gradient */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4">
              <div className="text-white">
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-2xl font-bold">{profile.name}</span>
                  <span className="text-xl font-light">{profile.age}</span>
                </div>
                {profile.bio && (
                  <p className="text-sm text-white/80 mb-2 line-clamp-2">{profile.bio}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs gap-1">
                    <GraduationCap className="w-3 h-3" />
                    {profile.faculty}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs gap-1">
                    <MapPin className="w-3 h-3" />
                    {profile.city}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => swipe("left")}
          className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-100 hover:scale-110 transition-transform active:scale-95"
        >
          <X className="w-7 h-7 text-red-400" />
        </button>
        <button
          onClick={() => swipe("right")}
          className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-100 hover:scale-110 transition-transform active:scale-95"
        >
          <Heart className="w-7 h-7 text-orange-500" />
        </button>
      </div>
    </div>
  );
}
