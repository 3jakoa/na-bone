import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Check,
  GraduationCap,
  Heart,
  Info,
  MapPin,
  MessageCircle,
  Send,
  Shield,
  Star,
  Users,
  Utensils,
  X,
} from "lucide-react";

const APP_URL = import.meta.env.VITE_APP_URL ?? "https://bonibuddy.app";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* ---------- HEADER ---------- */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-gray-900">
            <img src="/mascot.svg" alt="Boni Buddy" className="h-8 w-auto" />
            Boni Buddy
          </div>
          <nav className="flex items-center gap-7 text-sm">
            <a
              href="#kako"
              className="hidden md:inline text-gray-600 hover:text-gray-900"
            >
              Kako deluje
            </a>
            <a
              href="#funkcije"
              className="hidden md:inline text-gray-600 hover:text-gray-900"
            >
              Funkcije
            </a>
            <a
              href="#aplikacija"
              className="hidden md:inline text-gray-600 hover:text-gray-900"
            >
              Aplikacija
            </a>
            <Link to="/posts" className="text-gray-600 hover:text-gray-900">
              Javni boni
            </Link>
            <a
              href={APP_URL}
              className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark"
            >
              Odpri aplikacijo
            </a>
          </nav>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-brand-light/60 blur-3xl"
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-[1.05] tracking-tight">
          Ne koriščaj bona
          <br />
          <span className="text-brand">sam.</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Boni Buddy povezuje slovenske študente, ki bi radi šli skupaj na
          kosilo s študentskim bonom. Ustvariš objavo, najdeš družbo,
          dogovoriš se v klepetu.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={APP_URL}
            className="bg-brand text-white px-7 py-3 rounded-lg font-semibold hover:bg-brand-dark inline-flex items-center gap-2"
          >
            Začni zdaj
            <ArrowRight size={18} />
          </a>
          <Link
            to="/posts"
            className="px-7 py-3 rounded-lg font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          >
            Poglej javne bone
          </Link>
        </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="kako" className="border-t border-gray-100 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <SectionTitle
            kicker="Kako deluje"
            title="Od prijave do malice v štirih korakih"
            subtitle="Enostavno, hitro, brez zapletov."
          />
          <div className="mt-14 grid md:grid-cols-4 gap-6">
            <StepCard
              n={1}
              icon={<GraduationCap size={22} />}
              title="Prijava s študentskim e-mailom"
              desc="Preko Googla v nekaj sekundah. Preverimo, da imaš veljavno študentsko domeno."
            />
            <StepCard
              n={2}
              icon={<MapPin size={22} />}
              title="Ustvari objavo"
              desc="Izberi restavracijo iz baze 369+ ponudnikov, čas kosila in kratko sporočilo."
            />
            <StepCard
              n={3}
              icon={<Users size={22} />}
              title="Najdi družbo"
              desc="Swipaj profile sošolcev ali se odzovi na javne objave drugih študentov."
            />
            <StepCard
              n={4}
              icon={<Utensils size={22} />}
              title="Pojejta skupaj"
              desc="Po matchu se odpre klepet, kjer se dogovorita točen čas in kraj."
            />
          </div>
        </div>
      </section>

      {/* ---------- APP SHOWCASE ---------- */}
      <section
        id="aplikacija"
        className="relative bg-gray-50 border-y border-gray-100 py-24 overflow-hidden"
      >
        {/* Soft brand halo behind the phones */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full bg-brand-light/50 blur-3xl"
        />
        <div className="relative max-w-6xl mx-auto px-6">
          <SectionTitle
            kicker="Aplikacija"
            title="Tako izgleda Boni Buddy"
            subtitle="Nativna mobilna aplikacija za iOS in Android. Spodaj so tri glavni zasloni."
          />
          <div className="mt-16 grid md:grid-cols-3 gap-12 md:gap-8 items-start">
            <PhoneFrame label="Odkrivaj sošolce">
              <DiscoverMock />
            </PhoneFrame>
            <PhoneFrame label="Javne objave">
              <FeedMock />
            </PhoneFrame>
            <PhoneFrame label="Klepet po matchu">
              <ChatMock />
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="funkcije" className="max-w-6xl mx-auto px-6 py-24">
        <SectionTitle
          kicker="Funkcije"
          title="Vse, kar potrebuješ za družbo na malici"
          subtitle="Brez reklam, brez zapletov, brez tujcev — samo študenti."
        />
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<GraduationCap size={22} />}
            title="Samo za študente"
            desc="Registracija s študentskim e-mailom. Preverjamo domeno, tako da v skupnosti ni tujcev."
          />
          <FeatureCard
            icon={<MapPin size={22} />}
            title="369+ restavracij"
            desc="Predlagaj konkreten kraj iz uradne baze študentske prehrane — z naslovom, ceno doplačila in oceno."
          />
          <FeatureCard
            icon={<Users size={22} />}
            title="Javne in zasebne objave"
            desc="Javne objave vidijo vsi. Zasebne pošlješ le svojemu matchu po dogovoru."
          />
          <FeatureCard
            icon={<Heart size={22} />}
            title="Swipe deck"
            desc="Odkrivaj profile drugih študentov. Ko oba rečeta ja, se odpre klepet."
          />
          <FeatureCard
            icon={<MessageCircle size={22} />}
            title="Klepet v realnem času"
            desc="Ko imaš match, dobiš chat z aktivnim bonom, da se hitro dogovorita."
          />
          <FeatureCard
            icon={<Shield size={22} />}
            title="Google OAuth"
            desc="Prijaviš se z Google računom. Brez novega gesla, brez pozabljenih poverilnic."
          />
        </div>
      </section>

      {/* ---------- AUDIENCE + GLOSSARY ---------- */}
      <section className="bg-gray-50 border-y border-gray-100 py-24">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <SectionTitle
              kicker="Za koga je"
              title="Študenti, ki ne marajo jesti sami"
              align="left"
            />
            <ul className="mt-8 space-y-3 text-gray-700">
              <Bullet>Prvoletniki, ki iščejo novo družbo zunaj sošolcev s faksa.</Bullet>
              <Bullet>Erasmus študenti, ki želijo pravo slovensko izkušnjo.</Bullet>
              <Bullet>Vsi, ki jim je dolgčas malicati sami v menzi.</Bullet>
              <Bullet>Tisti, ki raje investirajo v boljše restavracije z doplačilom.</Bullet>
            </ul>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-brand-light text-brand-dark">
              <Info size={20} />
            </div>
            <div className="font-bold text-lg text-gray-900 mt-4">
              Kaj je "študentski bon"?
            </div>
            <p className="mt-2 text-gray-600 text-sm leading-relaxed">
              Študentski bon je subvencija Ministrstva za delo, družino,
              socialne zadeve in enake možnosti, s katero študenti dobijo
              ugoden obrok v več kot 369 partnerskih restavracijah po
              Sloveniji. Boni Buddy ti pomaga najti nekoga, s komer boš ta
              bon pojedel.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[420px] rounded-full bg-brand-light/60 blur-3xl"
        />
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
          Pripravljen na <span className="text-brand">boljšo</span> malico?
        </h2>
        <p className="mt-4 text-gray-600 text-lg">
          Prijava vzame manj kot minuto. Prvi match se lahko zgodi še danes.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={APP_URL}
            className="bg-brand text-white px-8 py-3.5 rounded-lg font-semibold hover:bg-brand-dark inline-flex items-center gap-2"
          >
            Odpri aplikacijo
            <ArrowRight size={18} />
          </a>
          <Link
            to="/posts"
            className="px-8 py-3.5 rounded-lg font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          >
            Poglej javne bone
          </Link>
        </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <img src="/mascot.svg" alt="" className="h-6 w-auto" />
            <span className="font-semibold text-gray-700">Boni Buddy</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/posts" className="hover:text-gray-900">
              Javni boni
            </Link>
            <a href={APP_URL} className="hover:text-gray-900">
              Aplikacija
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ================================================================
 * Presentational helpers
 * ================================================================ */

function SectionTitle({
  kicker,
  title,
  subtitle,
  align = "center",
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const a = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`${a} max-w-2xl`}>
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
        {kicker}
      </div>
      <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-gray-600 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

function StepCard({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-brand-light text-brand-dark flex items-center justify-center">
          {icon}
        </div>
        <div className="text-xs font-semibold text-gray-400 tracking-wider">
          KORAK {n}
        </div>
      </div>
      <div className="font-bold text-gray-900 mt-4">{title}</div>
      <div className="text-sm text-gray-600 mt-2 leading-relaxed">{desc}</div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-200 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-brand-light text-brand-dark flex items-center justify-center">
        {icon}
      </div>
      <div className="font-bold text-gray-900 mt-4">{title}</div>
      <div className="text-sm text-gray-600 mt-2 leading-relaxed">{desc}</div>
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 h-5 w-5 rounded-full bg-brand-light text-brand-dark flex items-center justify-center flex-shrink-0">
        <Check size={12} strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}

/* ================================================================
 * Phone frame + per-screen mockups
 * ================================================================ */

function PhoneFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[270px] h-[560px] bg-gray-900 rounded-[44px] p-2 shadow-xl">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-2xl z-20" />
        <div className="relative w-full h-full bg-white rounded-[36px] overflow-hidden font-sans">
          {children}
        </div>
      </div>
      <div className="mt-5 text-sm font-semibold text-gray-700">{label}</div>
    </div>
  );
}

function DiscoverMock() {
  return (
    <div className="h-full flex flex-col pt-8">
      <div className="px-5 pb-3">
        <div className="text-lg font-bold text-gray-900">Odkrivaj</div>
      </div>
      <div className="flex-1 mx-4 mb-4 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="h-[65%] bg-gradient-to-br from-brand-light to-brand/30 flex items-center justify-center">
          <span className="text-7xl font-bold text-brand-dark">M</span>
        </div>
        <div className="p-4 flex-1">
          <div className="font-bold text-gray-900">Maja, 21</div>
          <div className="flex items-center gap-1 mt-0.5">
            <GraduationCap size={11} className="text-gray-400" />
            <span className="text-xs text-gray-500">FRI, UL</span>
          </div>
          <div className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-2">
            Obožujem falafel in dolge pogovore o kodi.
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-5 pb-6">
        <div className="w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600">
          <X size={20} />
        </div>
        <div className="w-14 h-14 rounded-full bg-brand shadow-md flex items-center justify-center text-white">
          <Heart size={24} fill="white" />
        </div>
        <div className="w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-amber-500">
          <Star size={20} fill="currentColor" />
        </div>
      </div>
    </div>
  );
}

function FeedMock() {
  return (
    <div className="h-full flex flex-col pt-8 overflow-hidden">
      <div className="px-5 pb-3">
        <div className="text-lg font-bold text-gray-900">Javne objave</div>
      </div>
      <div className="flex-1 px-3 space-y-3 overflow-hidden">
        <FeedBone
          name="Luka"
          faculty="FF, UL"
          letter="L"
          restaurant="Falafel Shop"
          when="Danes ob 13:00"
          note="Kdo za falafel? Imam 30 min okna."
        />
        <FeedBone
          name="Ana"
          faculty="EF, UL"
          letter="A"
          restaurant="Hood Burger"
          when="Jutri ob 12:30"
          note="Buddy za burger?"
        />
      </div>
    </div>
  );
}

function FeedBone({
  name,
  faculty,
  letter,
  restaurant,
  when,
  note,
}: {
  name: string;
  faculty: string;
  letter: string;
  restaurant: string;
  when: string;
  note: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-xs font-bold text-brand-dark">
          {letter}
        </div>
        <div className="ml-2">
          <div className="text-xs font-semibold text-gray-900">{name}</div>
          <div className="text-[10px] text-gray-400">{faculty}</div>
        </div>
      </div>
      <div className="flex items-center mt-2.5">
        <Utensils size={12} className="text-brand" />
        <span className="ml-1.5 text-sm font-bold text-gray-900">
          {restaurant}
        </span>
        <span className="ml-1.5 flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold">
          <Star size={9} fill="currentColor" />4
        </span>
      </div>
      <div className="text-[10px] text-gray-400 ml-[18px]">
        Slovenska 5, Ljubljana
      </div>
      <div className="text-[10px] font-semibold text-green-600 ml-[18px] mt-0.5">
        1.50 EUR doplačilo
      </div>
      <div className="mt-2 inline-flex items-center gap-1 bg-brand-light text-brand-dark text-[10px] font-semibold px-2 py-1 rounded-md">
        <Calendar size={10} />
        {when}
      </div>
      <div className="text-[11px] text-gray-600 mt-1.5 leading-snug">
        {note}
      </div>
      <div className="mt-2 bg-brand text-white text-[11px] font-bold py-1.5 rounded-lg text-center">
        Pridruži se
      </div>
    </div>
  );
}

function ChatMock() {
  return (
    <div className="h-full flex flex-col pt-8">
      <div className="px-4 pb-3 flex items-center border-b border-gray-100">
        <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-sm font-bold text-brand-dark">
          L
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold text-gray-900">Luka</div>
          <div className="text-[10px] text-gray-400">FRI, UL</div>
        </div>
      </div>
      <div className="mx-4 mt-3 bg-brand-light rounded-lg p-2 flex items-center gap-1.5">
        <Utensils size={12} className="text-brand-dark" />
        <div className="text-[10px] font-semibold text-brand-dark">
          Falafel Shop · Danes ob 13:00
        </div>
      </div>
      <div className="flex-1 px-4 py-3 space-y-2 overflow-hidden">
        <ChatBubble side="them">Živjo! Si za falafel?</ChatBubble>
        <ChatBubble side="me">Zakaj pa ne. Ob 13:00?</ChatBubble>
        <ChatBubble side="them">Super, se vidiva pred vhodom.</ChatBubble>
        <ChatBubble side="me">Velja!</ChatBubble>
      </div>
      <div className="p-3 border-t border-gray-100 flex items-center gap-2">
        <div className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 text-xs text-gray-400">
          Napiši sporočilo...
        </div>
        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white">
          <Send size={14} />
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  side,
  children,
}: {
  side: "me" | "them";
  children: ReactNode;
}) {
  const isMe = side === "me";
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[11px] ${
          isMe
            ? "bg-brand text-white rounded-br-sm"
            : "bg-gray-100 text-gray-800 rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
