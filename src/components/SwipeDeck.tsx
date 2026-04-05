"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import { Utensils, GraduationCap, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  profiles: Profile[];
  myProfile: Profile;
}

export default function SwipeDeck({ profiles, myProfile }: Props) {
  const myProfileId = myProfile.id;
  const router = useRouter();
  const [queue] = useState<Profile[]>(profiles);
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);

  const profile = queue[current];

  async function swipe(direction: "left" | "right") {
    if (!profile) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("swipes")
      .insert({ swiper_id: myProfileId, swiped_id: profile.id, direction })
      .select()
      .single();

    if (error) {
      toast.error("Napaka pri swipu.");
      return;
    }

    if (direction === "right") {
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
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4"
        style={{ background: "linear-gradient(180deg, #44B5E5 0%, #b8dff5 70%, #e8f6fd 100%)" }}
      >
        <div className="text-5xl">🍽️</div>
        <h2 className="text-xl font-bold text-white">Ni več profilov</h2>
        <p className="text-white/80 text-sm">
          V tvojem mestu ni več novih profilov. Preveri jutri!
        </p>
      </div>
    );
  }

  const rotation = (dragX / 300) * 15;
  const likeOpacity = Math.min(dragX / 80, 1);
  const nopeOpacity = Math.min(-dragX / 80, 1);

  const nextProfile = queue[current + 1];

  return (
    <div
      className="flex flex-col items-center min-h-screen pb-28 pt-12 px-4"
      style={{ background: "linear-gradient(180deg, #44B5E5 0%, #b8dff5 70%, #e8f6fd 100%)" }}
    >
      {/* Header */}
      <div className="w-full max-w-sm text-center mb-8">
        <h1 className="text-4xl font-extrabold text-white drop-shadow-sm">Greš na bone?</h1>
        <p className="text-white/80 text-sm mt-1">
          Spodaj se ti prikazujejo vsi študenti iz {profile.city}
        </p>
      </div>

      {/* Card stack */}
      <div className="relative w-full max-w-sm select-none">
        {/* Next card peek */}
        {nextProfile && (
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-3xl shadow-md scale-95 opacity-70"
            style={{ zIndex: 0, top: "8px" }}
          />
        )}

        {/* Active card */}
        <div
          className="relative bg-white rounded-3xl shadow-xl cursor-grab active:cursor-grabbing overflow-hidden"
          style={{
            zIndex: 1,
            touchAction: "none",
            transform: `translateX(${dragX}px) translateY(${dragY * 0.2}px) rotate(${rotation}deg)`,
            transition: dragging ? "none" : "transform 0.3s ease",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Like / Nope overlays */}
          <div className="absolute top-5 left-5 rotate-[-20deg] border-4 border-green-400 rounded-xl px-3 py-1 z-10"
            style={{ opacity: likeOpacity }}>
            <span className="text-green-400 font-bold text-2xl">LIKE</span>
          </div>
          <div className="absolute top-5 right-5 rotate-[20deg] border-4 border-red-400 rounded-xl px-3 py-1 z-10"
            style={{ opacity: nopeOpacity }}>
            <span className="text-red-400 font-bold text-2xl">NOPE</span>
          </div>

          <div className="p-6">
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <img
                src={profile.photos[0] || "/placeholder.png"}
                alt={profile.name}
                className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md pointer-events-none"
              />
            </div>

            {/* Name + age */}
            <div className="text-center mb-3">
              <span className="text-2xl font-bold text-gray-900">{profile.name}</span>
              <span className="text-xl text-gray-400 ml-2">{profile.age}</span>
            </div>

            {/* Faculty + city */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                <GraduationCap className="w-3 h-3" />
                {profile.faculty}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                <MapPin className="w-3 h-3" />
                {profile.city}
              </span>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-center text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Restaurants */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 text-center mb-2 uppercase tracking-wide">Top restavracije</p>
              {profile.top_restaurants.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {profile.top_restaurants.slice(0, 3).map((r) => (
                    <span key={r} className="bg-brand-light text-brand-dark text-xs font-medium px-3 py-1 rounded-full">
                      🍽️ {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-300 text-center">Ni najljubših restavracij</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Like button */}
      <div className="mt-8 flex items-center justify-center">
        <button
          onClick={() => swipe("right")}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #44B5E5 0%, #5a9dc3 100%)" }}
        >
          <Utensils className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
}
