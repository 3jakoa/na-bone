import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Utensils, Star, MapPin, Clock } from "lucide-react";
import RespondButton from "./RespondButton";
import CreatePublicBoneButton from "./CreatePublicBoneButton";
import { formatScheduledDate } from "@/lib/formatDate";
import type { RestaurantInfo } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!myProfile) redirect("/onboarding");

  const { data: bones } = await supabase
    .from("meal_invites")
    .select("*")
    .eq("visibility", "public")
    .eq("status", "open")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(100);

  const authorIds = Array.from(new Set((bones ?? []).map((b) => b.user_id)));
  const { data: authors } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, name, photos, faculty, university, city")
        .in("id", authorIds)
    : { data: [] as any[] };
  const authorMap = new Map((authors ?? []).map((a: any) => [a.id, a]));

  // Fetch restaurant details for fallback (when restaurant_info is null)
  const { data: allRests } = await supabase
    .from("restaurants")
    .select("name, address, city, supplement_price, meal_price, rating");
  const restMap = new Map((allRests ?? []).map((r: any) => [r.name, r]));

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Javni boni</h1>
          <p className="text-sm text-white/70 mt-0.5">
            {bones?.length ? `${bones.length} odprtih povabil` : "Še ni javnih povabil"}
          </p>
        </div>
        <CreatePublicBoneButton myProfileId={myProfile.id} />
      </div>

      {(!bones || bones.length === 0) ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-10 flex flex-col items-center gap-3 text-center">
          <div className="text-5xl">🍽️</div>
          <p className="font-semibold text-gray-800">Trenutno ni javnih bonov</p>
          <p className="text-sm text-gray-500">Bodi prvi in objavi povabilo!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bones.map((bone) => {
            const author = authorMap.get(bone.user_id);
            if (!author) return null;
            const isMine = bone.user_id === myProfile.id;
            const ri: RestaurantInfo | null = (bone as any).restaurant_info ?? restMap.get(bone.restaurant) ?? null;
            return (
              <div key={bone.id} className="bg-white rounded-2xl shadow-md p-4 flex flex-col gap-3">
                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 shrink-0 ring-2 ring-white shadow">
                    <AvatarImage src={author.photos[0]} />
                    <AvatarFallback className="bg-brand-light text-brand-dark font-bold">
                      {author.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate">{author.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {author.faculty} · {author.city}
                    </div>
                  </div>
                </div>

                {/* Restaurant */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-brand shrink-0" />
                    <span className="font-semibold text-gray-900">{bone.restaurant}</span>
                    {ri?.rating != null && (ri.rating as number) > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span className="text-xs font-semibold">{ri.rating}</span>
                      </span>
                    )}
                  </div>
                  {ri && (ri.address || ri.city) && (
                    <div className="flex items-center gap-1 ml-5.5 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-400">
                        {[ri.address, ri.city].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {ri?.supplement_price != null && (
                    <div className="flex items-center gap-2 ml-5.5 mt-0.5">
                      <span className="text-xs font-semibold text-green-600">
                        {Number(ri.supplement_price).toFixed(2)} EUR doplačilo
                      </span>
                      {ri.meal_price != null && (
                        <span className="text-xs text-gray-400">
                          (cena obroka {Number(ri.meal_price).toFixed(2)})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Date/Time */}
                <div className="flex items-center gap-1.5 bg-brand-light/60 rounded-lg px-3 py-1.5 self-start">
                  <Clock className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="text-sm font-semibold text-brand-dark">
                    {formatScheduledDate(bone.scheduled_at)}
                  </span>
                </div>

                {bone.note && (
                  <p className="text-sm text-gray-600">{bone.note}</p>
                )}

                {!isMine && <RespondButton boneId={bone.id} />}
                {isMine && (
                  <span className="text-xs text-gray-400 italic">Tvoj javni bone</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
