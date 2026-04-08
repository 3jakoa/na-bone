import { Link } from "react-router-dom";

const APP_URL = import.meta.env.VITE_APP_URL ?? "https://app.bonibuddy.si";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-light to-white">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="font-bold text-xl text-brand-dark">🍽️ Boni Buddy</div>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/posts" className="text-gray-700 hover:text-brand-dark">Javni boni</Link>
          <a href={APP_URL} className="bg-brand text-white px-4 py-2 rounded-full hover:bg-brand-dark">Odpri aplikacijo</a>
        </nav>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
          Najdi družbo<br />za <span className="text-brand">bone</span>.
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto">
          Boni Buddy povezuje slovenske študente, ki bi radi šli na kosilo skupaj. Swipaj, klepetaj, jej.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <a href={APP_URL} className="bg-brand text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-dark">
            Začni zdaj
          </a>
          <Link to="/posts" className="px-6 py-3 rounded-full font-semibold border border-gray-300 hover:bg-white">
            Poglej javne bone
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { e: "🎓", t: "Samo za študente", d: "Registracija s študentskim e-mailom." },
          { e: "🍕", t: "Resnične restavracije", d: "Predlagaj kraj in čas, ne le besedilo." },
          { e: "💬", t: "Klepet po matchu", d: "Brez nelagodja, dogovor v sekundah." },
        ].map((f) => (
          <div key={f.t} className="bg-white rounded-2xl shadow p-6">
            <div className="text-3xl">{f.e}</div>
            <div className="font-bold text-lg mt-2">{f.t}</div>
            <div className="text-sm text-gray-600 mt-1">{f.d}</div>
          </div>
        ))}
      </section>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Boni Buddy
      </footer>
    </div>
  );
}
