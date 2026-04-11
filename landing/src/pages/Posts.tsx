import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, type PublicBone } from "../supabase";

const APP_URL = import.meta.env.VITE_APP_URL ?? "https://app.bonibuddy.si";

export default function Posts() {
  const [bones, setBones] = useState<PublicBone[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("meal_invites")
      .select("id, user_id, restaurant, scheduled_at, note, created_at")
      .eq("visibility", "public")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setBones((data ?? []) as PublicBone[]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-light to-white">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="font-bold text-xl text-brand-dark">🍽️ Boni Buddy</Link>
        <a href={APP_URL} className="bg-brand text-white px-4 py-2 rounded-full text-sm hover:bg-brand-dark">
          Odpri aplikacijo
        </a>
      </header>

      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Javni boni</h1>
        <p className="text-gray-600 mt-2">
          Študenti, ki trenutno iščejo družbo za kosilo. Prijavi se v aplikacijo, da odgovoriš.
        </p>

        {error && <div className="mt-6 bg-red-50 text-red-700 p-4 rounded-xl text-sm">{error}</div>}
        {bones === null && !error && <div className="mt-10 text-gray-500">Nalagam...</div>}
        {bones && bones.length === 0 && (
          <div className="mt-10 bg-white rounded-2xl shadow p-10 text-center">
            <div className="text-5xl">🍽️</div>
            <p className="font-semibold text-gray-800 mt-3">Trenutno ni javnih bonov</p>
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {bones?.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl shadow p-5">
              <div className="font-bold text-lg text-gray-900">{b.restaurant}</div>
              <div className="text-sm text-gray-500">
                {new Date(b.scheduled_at).toLocaleString("sl-SI")}
              </div>
              {b.note && <div className="text-sm text-gray-700 mt-2">{b.note}</div>}
              <a
                href={APP_URL}
                className="mt-4 inline-block bg-brand text-white text-sm px-4 py-2 rounded-full hover:bg-brand-dark"
              >
                Odgovori v aplikaciji
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
