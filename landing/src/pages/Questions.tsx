import { Link } from "react-router-dom";

const SUPPORT_EMAIL = "jaka@bonibuddy.app";

const questions = [
  {
    question: "Kaj je Boni Buddy?",
    answer:
      "Boni Buddy je aplikacija za študente, ki želijo najti družbo za obrok na bone. Objaviš, kam in kdaj greš jest, ali pa pogledaš, kdo že išče buddyja.",
  },
  {
    question: "Za koga je aplikacija?",
    answer:
      "Aplikacija je namenjena študentom, ki uporabljajo študentske bone in bi radi lažje našli družbo za kosilo, večerjo ali spontani obrok med predavanji.",
  },
  {
    question: "Kako najdem buddyja?",
    answer:
      "V aplikaciji lahko objaviš svoj bon, pregledaš javne objave drugih študentov ali swipe-aš profile. Ko se z nekom ujameta, se lahko dogovorita v klepetu.",
  },
  {
    question: "Ali je Boni Buddy brezplačen?",
    answer:
      "Da, uporaba aplikacije je trenutno brezplačna. Za obrok in morebitno doplačilo v restavraciji poskrbi vsak uporabnik sam.",
  },
  {
    question: "Kako delujejo javni boni?",
    answer:
      "Javni bon je objava, s katero drugim uporabnikom pokažeš, da iščeš družbo za izbrano restavracijo in termin. Če je objava javna, se lahko prikaže tudi na landing strani.",
  },
  {
    question: "Ali lahko povabim prijatelja?",
    answer:
      "Da. Prijatelju lahko pošlješ invite link. Ko odpre link in ima aplikacijo nameščeno, lahko potrdi povezavo v Boni Buddyju.",
  },
  {
    question: "Kdaj dobim obvestila?",
    answer:
      "Če dovoliš potisna obvestila, jih lahko prejmeš za nova ujemanja, sporočila, povabila za bone in pomembne odzive na tvoje objave.",
  },
  {
    question: "Ali aplikacija preverja moj študentski status?",
    answer:
      "Boni Buddy pomaga pri iskanju družbe in dogovarjanju. Upravičenost do subvencionirane prehrane in uporabo bonov še vedno urejaš prek uradnega sistema za študentsko prehrano.",
  },
  {
    question: "Kaj naredim, če nekaj ne deluje?",
    answer:
      "Najhitreje nam pišeš na podporni email. Opiši, kaj se je zgodilo, katero napravo uporabljaš in po možnosti priloži posnetek zaslona.",
  },
];

export default function Questions() {
  return (
    <div className="min-h-screen bg-[#f5fcff] font-sans text-black">
      <header className="mx-auto flex max-w-[1040px] items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/invite-logo-circle.png"
            alt="Boni Buddy"
            className="h-10 w-10 rounded-full object-cover"
          />
          <span className="text-[20px] font-bold">BoniBuddy</span>
        </Link>
      </header>

      <main className="mx-auto max-w-[1040px] px-5 pb-16 pt-8 sm:px-8 sm:pb-24">
        <section className="rounded-[28px] bg-white px-6 py-10 shadow-[0_8px_28px_rgba(71,189,239,0.18)] sm:px-10 sm:py-14 lg:px-16">
          <p className="text-[18px] font-semibold text-[#0191d7]">
            Boni Buddy pomoč
          </p>
          <h1 className="mt-3 font-['Poppins'] text-[42px] font-semibold leading-tight tracking-[-0.02em] sm:text-[56px]">
            Pogosta vprašanja
          </h1>
          <p className="mt-6 max-w-[760px] text-[20px] leading-9">
            Odgovori na najpogostejša vprašanja o aplikaciji, objavah za bone,
            buddyjih, povabilih in obvestilih.
          </p>
        </section>

        <div className="mt-8 grid gap-5">
          {questions.map((item) => (
            <section
              key={item.question}
              className="rounded-[20px] border border-[rgba(71,189,239,0.2)] bg-white p-6 shadow-[0_0_20px_rgba(71,189,239,0.14)] sm:p-8"
            >
              <h2 className="font-['Poppins'] text-[24px] font-semibold leading-tight sm:text-[28px]">
                {item.question}
              </h2>
              <p className="mt-4 text-[17px] leading-8 text-black/70">
                {item.answer}
              </p>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-[24px] bg-white p-6 shadow-[0_0_20px_rgba(71,189,239,0.14)] sm:p-8">
          <div>
            <h2 className="font-['Poppins'] text-[28px] font-semibold leading-tight sm:text-[34px]">
              Nisi našel odgovora?
            </h2>
            <p className="mt-3 max-w-[620px] text-[17px] leading-8 text-black/70">
              Piši nam na{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Vprašanje za BoniBuddy")}`}
                className="font-semibold text-[#0191d7] hover:text-[#0080c0]"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        </section>

        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex h-12 items-center justify-center rounded-[18px] bg-[#00A6F6] px-5 text-[17px] font-bold text-white shadow-[0_2px_4px_#47bdef] transition hover:bg-[#0080C0]"
          >
            Nazaj na stran
          </Link>
        </div>
      </main>
    </div>
  );
}
