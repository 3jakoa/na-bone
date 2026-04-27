import { Link } from "react-router-dom";

const SUPPORT_EMAIL = "bonibuddyapp@gmail.com";

const standards = [
  {
    title: "1. Ničelna toleranca do CSAE in CSAM",
    body: [
      "Boni Buddy izrecno prepoveduje spolno zlorabo in izkoriščanje otrok (CSAE) ter gradivo s spolno zlorabo otrok (CSAM). Prepovedani so tudi poskusi navezovanja stika z otrokom z namenom spolnega izkoriščanja, nagovarjanje, izsiljevanje, trgovina z otroki, deljenje ali iskanje spolnih vsebin z mladoletnimi osebami in vsakršno ravnanje, ki ogroža otroka.",
      "Ta standard velja za profile, fotografije, objave za bone, povabila, sporočila v klepetu, uporabniška imena, opise profilov in vse druge vsebine ali interakcije v aplikaciji.",
    ],
  },
  {
    title: "2. Prijava pomislekov in zlorab",
    body: [
      `Uporabniki lahko neprimerno vsebino, vedenje, varnostne pomisleke ali sum CSAE/CSAM prijavijo v aplikaciji prek Pomoč > Kontakt oziroma Pomoč > Prijavi napako ali neposredno na ${SUPPORT_EMAIL}.`,
      "Pri prijavi naj uporabnik, če je varno, navede opis situacije, uporabniško ime ali profil, čas dogodka, povezano sporočilo ali objavo in morebitne posnetke zaslona. Prijave obravnavamo zaupno in prednostno.",
    ],
  },
  {
    title: "3. Ukrepanje ob prijavi ali dejanski seznanitvi",
    body: [
      "Ko smo seznanjeni z domnevno kršitvijo teh standardov, lahko pregledamo prijavljeno vsebino, omejimo dostop, odstranimo vsebino, začasno ali trajno blokiramo račun, ohranimo potrebne dokaze in sprejmemo druge ukrepe za zaščito uporabnikov.",
      "Če pridobimo dejansko vednost o CSAM ali resni nevarnosti za otroka, bomo ukrepali v skladu z veljavno zakonodajo in po potrebi prijavili zadevo pristojnim organom ali ustreznim regionalnim organom za varnost otrok.",
    ],
  },
  {
    title: "4. Skladnost z zakoni o varnosti otrok",
    body: [
      "Boni Buddy si prizadeva ravnati skladno z veljavnimi zakoni in pravili glede varnosti otrok, spletnih storitev, poročanja nezakonitih vsebin in zaščite osebnih podatkov.",
      "Zloraba aplikacije za ustvarjanje, nalaganje, deljenje, pridobivanje ali spodbujanje CSAM/CSAE je strogo prepovedana in lahko vodi do odstranitve vsebine, prepovedi uporabe in prijave pristojnim organom.",
    ],
  },
  {
    title: "5. Kontaktna točka za varnost otrok",
    body: [
      `Za obvestila Google Play, uporabniške prijave in druga vprašanja glede CSAE/CSAM je kontaktna točka Boni Buddy dosegljiva na ${SUPPORT_EMAIL}.`,
      "Kontaktna oseba je pripravljena obravnavati varnostne prijave, pojasniti postopke pregleda in ukrepanja ter koordinirati potrebne nadaljnje korake.",
    ],
  },
];

export default function ChildSafety() {
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
            Boni Buddy
          </p>
          <h1 className="mt-3 font-['Poppins'] text-[42px] font-semibold leading-tight tracking-[-0.02em] sm:text-[56px]">
            Standardi za varnost otrok
          </h1>
          <p className="mt-4 max-w-[720px] text-[18px] leading-8 text-black/65">
            Zadnja posodobitev: 27. april 2026
          </p>
          <p className="mt-6 max-w-[780px] text-[20px] leading-9">
            Ta stran objavlja standarde Boni Buddy za preprečevanje spolne
            zlorabe in izkoriščanja otrok (CSAE) ter ravnanje ob prijavah
            gradiva s spolno zlorabo otrok (CSAM).
          </p>
        </section>

        <div className="mt-8 space-y-5">
          {standards.map((section) => (
            <section
              key={section.title}
              className="rounded-[20px] border border-[rgba(71,189,239,0.2)] bg-white p-6 shadow-[0_0_20px_rgba(71,189,239,0.14)] sm:p-8"
            >
              <h2 className="font-['Poppins'] text-[24px] font-semibold leading-tight sm:text-[30px]">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-[17px] leading-8 text-black/70">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 rounded-[20px] bg-white p-6 shadow-[0_0_20px_rgba(71,189,239,0.14)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[17px] leading-7 text-black/70">
            Za nujne ali resne pomisleke glede varnosti otrok pišite na{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Varnost otrok - Boni Buddy")}`}
              className="font-semibold text-[#0191d7] hover:text-[#0080c0]"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <Link
            to="/"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-[18px] bg-[#00A6F6] px-5 text-[17px] font-bold text-white shadow-[0_2px_4px_#47bdef] transition hover:bg-[#0080C0]"
          >
            Nazaj na stran
          </Link>
        </div>
      </main>
    </div>
  );
}
