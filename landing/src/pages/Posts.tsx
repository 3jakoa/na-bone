import { useEffect, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Star,
  Utensils,
  X,
} from "lucide-react";
import {
  supabase,
  type PublicAuthor,
  type PublicBone,
  type RestaurantInfo,
} from "../supabase";

const APP_URL = import.meta.env.VITE_APP_URL ?? "https://bonibuddy.app";

type FeedItem = PublicBone & { author?: PublicAuthor };

const DAYS = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];

function formatScheduledDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round(
    (dateDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
  if (diff === 0) return `Danes ob ${time}`;
  if (diff === 1) return `Jutri ob ${time}`;
  const dayName = DAYS[date.getDay()];
  const d = date.getDate();
  const m = date.getMonth() + 1;
  return `${dayName}, ${d}.${m}. ob ${time}`;
}

export default function Posts() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBone, setSelectedBone] = useState<FeedItem | null>(null);

  // Prevent body scroll while modal is open; close on Escape.
  useEffect(() => {
    if (!selectedBone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedBone(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedBone]);

  useEffect(() => {
    (async () => {
      const { data: bones, error: bonesErr } = await supabase
        .from("meal_invites")
        .select(
          "id, user_id, restaurant, restaurant_info, scheduled_at, note, created_at"
        )
        .eq("visibility", "public")
        .eq("status", "open")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(100);

      if (bonesErr) {
        setError(bonesErr.message);
        return;
      }

      const list = (bones ?? []) as PublicBone[];

      const ids = Array.from(new Set(list.map((b) => b.user_id)));
      const { data: authors } = ids.length
        ? await supabase
            .from("public_profiles")
            .select("id, name, faculty, photos")
            .in("id", ids)
        : { data: [] as PublicAuthor[] };
      const authorMap = new Map(
        (authors ?? []).map((a) => [a.id, a as PublicAuthor])
      );

      const needLookup = list.filter((b) => !b.restaurant_info);
      const lookupNames = Array.from(
        new Set(needLookup.map((b) => b.restaurant))
      );
      const restLookup = new Map<string, RestaurantInfo>();
      if (lookupNames.length > 0) {
        const { data: rests } = await supabase
          .from("restaurants")
          .select("name, address, city, supplement_price, meal_price, rating")
          .in("name", lookupNames);
        for (const r of rests ?? []) {
          restLookup.set(r.name, {
            address: r.address,
            city: r.city,
            rating: r.rating,
            supplement_price: r.supplement_price,
            meal_price: r.meal_price,
          });
        }
      }

      setItems(
        list.map((b) => ({
          ...b,
          restaurant_info:
            b.restaurant_info ?? restLookup.get(b.restaurant) ?? null,
          author: authorMap.get(b.user_id),
        }))
      );
    })();
  }, []);

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Page-wide brand halo — multiple soft blobs spanning the whole page */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] rounded-full bg-brand-light/60 blur-3xl" />
        <div className="absolute top-[40%] -left-40 w-[700px] h-[600px] rounded-full bg-brand-light/50 blur-3xl" />
        <div className="absolute top-[70%] -right-40 w-[700px] h-[600px] rounded-full bg-brand-light/50 blur-3xl" />
      </div>

      <div className="relative">
      {/* ---------- HEADER ---------- */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg text-gray-900"
          >
            <img src="/mascot.svg" alt="Boni Buddy" className="h-8 w-auto" />
            Boni Buddy
          </Link>
          <a
            href={APP_URL}
            className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-dark"
          >
            Odpri aplikacijo
          </a>
        </div>
      </header>

      {/* ---------- TITLE ---------- */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
          Feed
        </div>
        <h1 className="mt-2 text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
          Javni boni
        </h1>
        <p className="mt-3 text-gray-600 max-w-2xl leading-relaxed">
          Študenti, ki trenutno iščejo družbo za kosilo. Klikni bon za več
          podrobnosti, nato se prijavi v aplikacijo, da odgovoriš.
        </p>
      </section>

      {/* ---------- LIST ---------- */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {items === null && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {Array.from({ length: 6 }).map((_, i) => (
              <BoneSkeleton key={i} />
            ))}
          </div>
        )}

        {items && items.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center max-w-xl mx-auto">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-light text-brand-dark">
              <Utensils size={26} />
            </div>
            <p className="font-bold text-gray-900 mt-5 text-lg">
              Trenutno ni javnih bonov
            </p>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Bodi prvi — odpri aplikacijo in objavi svoj bon.
            </p>
            <a
              href={APP_URL}
              className="mt-6 inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-brand-dark"
            >
              Odpri aplikacijo
              <ArrowRight size={16} />
            </a>
          </div>
        )}

        {items && items.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {items.map((b) => {
              const ri = b.restaurant_info;
              const stop = (e: MouseEvent) => e.stopPropagation();
              return (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBone(b)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedBone(b);
                    }
                  }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col text-left cursor-pointer transition-all hover:border-gray-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {/* Author row */}
                  {b.author && (
                    <div className="flex items-center mb-4">
                      {b.author.photos?.[0] ? (
                        <img
                          src={b.author.photos[0]}
                          alt={b.author.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center font-bold text-brand-dark">
                          {b.author.name[0]}
                        </div>
                      )}
                      <div className="ml-3 min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {b.author.name}
                        </div>
                        {b.author.faculty && (
                          <div className="text-xs text-gray-400 truncate">
                            {b.author.faculty}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Restaurant block */}
                  <div className="mb-3">
                    <div className="flex items-start gap-2">
                      <Utensils
                        size={16}
                        className="text-brand shrink-0 mt-1"
                      />
                      <div className="flex-1 min-w-0 font-bold text-lg text-gray-900 leading-snug break-words line-clamp-2">
                        {b.restaurant}
                      </div>
                      {ri?.rating != null && ri.rating > 0 && (
                        <div className="flex items-center gap-0.5 shrink-0 text-amber-500 text-xs font-semibold mt-1">
                          <Star size={12} fill="currentColor" />
                          {ri.rating}
                        </div>
                      )}
                    </div>
                    {ri && (ri.address || ri.city) && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5 ml-6 truncate">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">
                          {[ri.address, ri.city].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                    {ri?.supplement_price != null && (
                      <div className="ml-6 mt-1">
                        <span className="text-xs font-semibold text-green-600">
                          {Number(ri.supplement_price).toFixed(2)} EUR doplačilo
                        </span>
                        {ri.meal_price != null && (
                          <span className="text-xs text-gray-400 ml-1.5">
                            (obrok {Number(ri.meal_price).toFixed(2)})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Scheduled pill */}
                  <div className="bg-brand-light text-brand-dark rounded-lg px-3 py-1.5 text-sm font-semibold self-start inline-flex items-center gap-1.5 mb-3">
                    <Calendar size={14} />
                    {formatScheduledDate(b.scheduled_at)}
                  </div>

                  {b.note && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                      {b.note}
                    </p>
                  )}

                  <a
                    href={APP_URL}
                    onClick={stop}
                    className="mt-auto inline-flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-brand-dark"
                  >
                    Odgovori v aplikaciji
                    <ArrowRight size={14} />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- DETAIL MODAL ---------- */}
      {selectedBone && (
        <BoneDetailModal
          item={selectedBone}
          onClose={() => setSelectedBone(null)}
        />
      )}
      </div>
    </div>
  );
}

/* ================================================================
 * Skeleton placeholder while bones are loading
 * ================================================================ */

function BoneSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-gray-100" />
        <div className="ml-3 flex-1">
          <div className="h-3 w-24 bg-gray-100 rounded" />
          <div className="h-2 w-16 bg-gray-100 rounded mt-2" />
        </div>
      </div>
      <div className="h-5 w-3/4 bg-gray-100 rounded" />
      <div className="h-3 w-1/2 bg-gray-100 rounded mt-2" />
      <div className="h-7 w-40 bg-gray-100 rounded-lg mt-4" />
      <div className="h-3 w-full bg-gray-100 rounded mt-4" />
      <div className="h-3 w-2/3 bg-gray-100 rounded mt-2" />
      <div className="h-10 w-full bg-gray-100 rounded-lg mt-5" />
    </div>
  );
}

/* ================================================================
 * Detail modal — fuller view of a single bone
 * ================================================================ */

function BoneDetailModal({
  item,
  onClose,
}: {
  item: FeedItem;
  onClose: () => void;
}) {
  const b = item;
  const ri = b.restaurant_info;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
            Javni bon
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
            aria-label="Zapri"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          {b.author && (
            <div className="flex items-center mb-5">
              {b.author.photos?.[0] ? (
                <img
                  src={b.author.photos[0]}
                  alt={b.author.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center font-bold text-brand-dark">
                  {b.author.name[0]}
                </div>
              )}
              <div className="ml-3 min-w-0">
                <div className="font-semibold text-gray-900">
                  {b.author.name}
                </div>
                {b.author.faculty && (
                  <div className="text-xs text-gray-400">
                    {b.author.faculty}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-start gap-2">
              <Utensils size={18} className="text-brand shrink-0 mt-1" />
              <div className="flex-1 min-w-0 font-bold text-xl text-gray-900 leading-snug break-words">
                {b.restaurant}
              </div>
              {ri?.rating != null && ri.rating > 0 && (
                <div className="flex items-center gap-0.5 shrink-0 text-amber-500 text-sm font-semibold mt-1">
                  <Star size={14} fill="currentColor" />
                  {ri.rating}
                </div>
              )}
            </div>
            {ri && (ri.address || ri.city) && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-2 ml-7">
                <MapPin size={13} />
                {[ri.address, ri.city].filter(Boolean).join(", ")}
              </div>
            )}
            {ri?.supplement_price != null && (
              <div className="ml-7 mt-1">
                <span className="text-sm font-semibold text-green-600">
                  {Number(ri.supplement_price).toFixed(2)} EUR doplačilo
                </span>
                {ri.meal_price != null && (
                  <span className="text-sm text-gray-400 ml-1.5">
                    (obrok {Number(ri.meal_price).toFixed(2)})
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="bg-brand-light text-brand-dark rounded-lg px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5 mb-5">
            <Calendar size={14} />
            {formatScheduledDate(b.scheduled_at)}
          </div>

          {b.note && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-5 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
              {b.note}
            </div>
          )}

          <a
            href={APP_URL}
            className="w-full bg-brand text-white text-sm font-semibold px-4 py-3 rounded-lg hover:bg-brand-dark inline-flex items-center justify-center gap-2"
          >
            Odgovori v aplikaciji
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
