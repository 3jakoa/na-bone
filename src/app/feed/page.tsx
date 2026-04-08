import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Utensils } from "lucide-react";
import RespondButton from "./RespondButton";
import CreatePublicBoneButton from "./CreatePublicBoneButton";

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
    .from("bones")
    .select("id, user_id, restaurant, scheduled_at, note, created_at")
    .eq("visibility", "public")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);

  const authorIds = Array.from(new Set((bones ?? []).map((b) => b.user_id)));
  const { data: authors } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, name, photos, faculty, university, city")
        .in("id", authorIds)
    : { data: [] as { id: string; name: string; photos: string[]; faculty: string; university: string; city: string }[] };

  const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));

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
            return (
              <div key={bone.id} className="bg-white rounded-2xl shadow-md p-4 flex flex-col gap-3">
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
                <div className="flex items-start gap-2 text-sm">
                  <Utensils className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{bone.restaurant}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(bone.scheduled_at).toLocaleString("sl-SI")}
                    </div>
                    {bone.note && (
                      <div className="text-xs text-gray-600 mt-1">{bone.note}</div>
                    )}
                  </div>
                </div>
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
