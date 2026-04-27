import { Link } from "react-router-dom";

const SUPPORT_EMAIL = "jaka@bonibuddy.app";

const sections = [
  {
    title: "1. Kdo smo",
    body: [
      "Boni Buddy je aplikacija za študente, ki pomaga najti družbo za obroke na bone, ustvarjati objave za obroke, se povezovati z drugimi uporabniki in se dogovarjati prek klepeta.",
      `Za vprašanja glede zasebnosti nam lahko pišete na ${SUPPORT_EMAIL}.`,
    ],
  },
  {
    title: "2. Katere podatke zbiramo",
    body: [
      "Zbiramo podatke, ki jih vnesete ob registraciji in uporabi aplikacije, kot so ime, e-poštni naslov, fakulteta, fotografije profila, opis profila, preference, objave za bone, odzivi na objave, ujemanja, povabila, sporočila v klepetu in nastavitve obvestil.",
      "Ob uporabi aplikacije lahko obdelujemo tudi tehnične podatke, kot so identifikator uporabnika, podatki o prijavi, naslov IP, podatki o napravi, žetoni za potisna obvestila, čas uporabe in osnovni diagnostični podatki, ki so potrebni za varno in zanesljivo delovanje storitve.",
    ],
  },
  {
    title: "3. Zakaj podatke uporabljamo",
    body: [
      "Podatke uporabljamo za ustvarjanje in upravljanje uporabniškega računa, prikaz profilov in javnih objav, omogočanje ujemanj, klepeta, povabil, obvestil in drugih funkcij aplikacije.",
      "Podatke uporabljamo tudi za varnost, preprečevanje zlorab, odpravljanje napak, podporo uporabnikom, izboljšave aplikacije ter izpolnjevanje pravnih obveznosti, kadar je to potrebno.",
    ],
  },
  {
    title: "4. Pravna podlaga",
    body: [
      "Podatke obdelujemo, kadar je to potrebno za zagotavljanje storitve, za katero se registrirate, na podlagi vašega soglasja, kadar ga podate, na podlagi zakonitega interesa za varnost in izboljšave storitve ter za izpolnjevanje pravnih obveznosti.",
      "Soglasje lahko kadarkoli prekličete, vendar to ne vpliva na zakonitost obdelave pred preklicem.",
    ],
  },
  {
    title: "5. Deljenje podatkov",
    body: [
      "Določeni podatki so vidni drugim uporabnikom aplikacije, na primer ime, fotografije profila, fakulteta, objave za bone in informacije, ki jih pošljete v klepetu ali povabilih.",
      "Podatkov ne prodajamo. Podatke lahko delimo s ponudniki, ki nam pomagajo zagotavljati aplikacijo, kot so ponudniki gostovanja, podatkovne baze, avtentikacije, shranjevanja slik, potisnih obvestil in distribucije aplikacije. Ti ponudniki lahko podatke obdelujejo samo za namen zagotavljanja svojih storitev.",
    ],
  },
  {
    title: "6. Fotografije, objave in klepet",
    body: [
      "Fotografije profila in podatki, ki jih objavite kot javno objavo za bone, so lahko vidni drugim uporabnikom in lahko tudi na javnih delih spletne strani, kadar je objava označena kot javna.",
      "Sporočila v klepetu so namenjena uporabnikom, ki sodelujejo v posameznem pogovoru. Do njih lahko dostopamo samo, kadar je to potrebno za podporo, varnost, preiskavo zlorab ali izpolnjevanje pravnih zahtev.",
    ],
  },
  {
    title: "7. Potisna obvestila",
    body: [
      "Če omogočite obvestila, shranimo žeton za potisna obvestila in ga uporabimo za obveščanje o ujemanjih, sporočilih, povabilih in drugih pomembnih dogodkih v aplikaciji.",
      "Obvestila lahko kadarkoli izklopite v nastavitvah aplikacije ali operacijskega sistema.",
    ],
  },
  {
    title: "8. Hramba podatkov",
    body: [
      "Podatke hranimo toliko časa, kolikor je potrebno za zagotavljanje aplikacije, upravljanje računa, varnost, reševanje sporov in izpolnjevanje pravnih obveznosti.",
      "Ko izbrišete račun ali zahtevate izbris podatkov, bomo podatke izbrisali ali anonimizirali, razen če jih moramo hraniti zaradi zakonitih razlogov, kot so varnost, preprečevanje zlorab ali pravne obveznosti.",
    ],
  },
  {
    title: "9. Vaše pravice",
    body: [
      "V skladu z veljavno zakonodajo lahko zahtevate dostop do svojih podatkov, popravek, izbris, omejitev obdelave, prenosljivost podatkov ali ugovarjate določeni obdelavi.",
      `Zahtevo lahko pošljete na ${SUPPORT_EMAIL}. Pred obravnavo zahteve vas lahko prosimo za potrditev identitete.`,
    ],
  },
  {
    title: "10. Varnost",
    body: [
      "Uporabljamo razumne tehnične in organizacijske ukrepe za zaščito podatkov pred nepooblaščenim dostopom, izgubo, zlorabo ali spremembo.",
      "Nobena spletna ali mobilna storitev ni popolnoma varna, zato priporočamo, da v aplikaciji ne delite občutljivih informacij, ki niso potrebne za dogovor o obroku.",
    ],
  },
  {
    title: "11. Spremembe politike",
    body: [
      "To politiko lahko občasno posodobimo. Nova različica bo objavljena na tej strani, pri pomembnih spremembah pa vas lahko obvestimo tudi v aplikaciji ali po e-pošti.",
    ],
  },
];

const childSafetyStandards = [
  {
    title: "Ničelna toleranca do CSAE in CSAM",
    body: [
      "Boni Buddy izrecno prepoveduje spolno zlorabo in izkoriščanje otrok (CSAE) ter gradivo s spolno zlorabo otrok (CSAM). Prepovedani so tudi poskusi navezovanja stika z otrokom z namenom spolnega izkoriščanja, nagovarjanje, izsiljevanje, trgovina z otroki, deljenje ali iskanje spolnih vsebin z mladoletnimi osebami in vsakršno ravnanje, ki ogroža otroka.",
      "Ta standard velja za profile, fotografije, objave za bone, povabila, sporočila v klepetu, uporabniška imena, opise profilov in vse druge vsebine ali interakcije v aplikaciji.",
    ],
  },
  {
    title: "Prijava pomislekov in zlorab",
    body: [
      `Uporabniki lahko neprimerno vsebino, vedenje, varnostne pomisleke ali sum CSAE/CSAM prijavijo v aplikaciji prek Pomoč > Kontakt oziroma Pomoč > Prijavi napako ali neposredno na ${SUPPORT_EMAIL}.`,
      "Pri prijavi naj uporabnik, če je varno, navede opis situacije, uporabniško ime ali profil, čas dogodka, povezano sporočilo ali objavo in morebitne posnetke zaslona. Prijave obravnavamo zaupno in prednostno.",
    ],
  },
  {
    title: "Ukrepanje ob prijavi ali dejanski seznanitvi",
    body: [
      "Ko smo seznanjeni z domnevno kršitvijo teh standardov, lahko pregledamo prijavljeno vsebino, omejimo dostop, odstranimo vsebino, začasno ali trajno blokiramo račun, ohranimo potrebne dokaze in sprejmemo druge ukrepe za zaščito uporabnikov.",
      "Če pridobimo dejansko vednost o CSAM ali resni nevarnosti za otroka, bomo ukrepali v skladu z veljavno zakonodajo in po potrebi prijavili zadevo pristojnim organom ali ustreznim regionalnim organom za varnost otrok.",
    ],
  },
  {
    title: "Skladnost z zakoni o varnosti otrok",
    body: [
      "Boni Buddy si prizadeva ravnati skladno z veljavnimi zakoni in pravili glede varnosti otrok, spletnih storitev, poročanja nezakonitih vsebin in zaščite osebnih podatkov.",
      "Zloraba aplikacije za ustvarjanje, nalaganje, deljenje, pridobivanje ali spodbujanje CSAM/CSAE je strogo prepovedana in lahko vodi do odstranitve vsebine, prepovedi uporabe in prijave pristojnim organom.",
    ],
  },
  {
    title: "Kontaktna točka za varnost otrok",
    body: [
      `Za obvestila Google Play, uporabniške prijave in druga vprašanja glede CSAE/CSAM je kontaktna točka Boni Buddy dosegljiva na ${SUPPORT_EMAIL}.`,
      "Kontaktna oseba je pripravljena obravnavati varnostne prijave, pojasniti postopke pregleda in ukrepanja ter koordinirati potrebne nadaljnje korake.",
    ],
  },
];

export default function Privacy() {
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
            Zasebnostna politika
          </h1>
          <p className="mt-4 max-w-[720px] text-[18px] leading-8 text-black/65">
            Zadnja posodobitev: 27. april 2026
          </p>
          <p className="mt-6 max-w-[760px] text-[20px] leading-9">
            Ta zasebnostna politika pojasnjuje, katere osebne podatke obdeluje
            Boni Buddy, zakaj jih uporabljamo, komu jih lahko razkrijemo in
            katere pravice imate kot uporabnik.
          </p>
        </section>

        <div className="mt-8 space-y-5">
          {sections.map((section) => (
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

          <section
            id="varnost-otrok"
            className="scroll-mt-6 rounded-[24px] border border-[rgba(71,189,239,0.2)] bg-white p-6 shadow-[0_0_20px_rgba(71,189,239,0.14)] sm:p-8"
          >
            <p className="text-[17px] font-semibold text-[#0191d7]">
              Standardi za varnost otrok
            </p>
            <h2 className="mt-2 font-['Poppins'] text-[30px] font-semibold leading-tight sm:text-[38px]">
              Preprečevanje CSAE in CSAM
            </h2>
            <p className="mt-4 max-w-[780px] text-[17px] leading-8 text-black/70">
              Ta razdelek objavlja standarde Boni Buddy za preprečevanje spolne
              zlorabe in izkoriščanja otrok (CSAE) ter ravnanje ob prijavah
              gradiva s spolno zlorabo otrok (CSAM).
            </p>

            <div className="mt-6 space-y-6">
              {childSafetyStandards.map((standard) => (
                <div key={standard.title}>
                  <h3 className="font-['Poppins'] text-[22px] font-semibold leading-tight">
                    {standard.title}
                  </h3>
                  <div className="mt-3 space-y-3 text-[17px] leading-8 text-black/70">
                    {standard.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-10 flex flex-col gap-4 rounded-[20px] bg-white p-6 shadow-[0_0_20px_rgba(71,189,239,0.14)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[17px] leading-7 text-black/70">
            Vprašanja glede zasebnosti lahko pošljete na{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
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
