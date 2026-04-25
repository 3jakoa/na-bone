import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  AppleStoreIcon,
  GooglePlayIcon,
  StoreButton,
  TESTFLIGHT_URL,
} from "../components/StoreButton";

export default function Invite() {
  const { token } = useParams<{ token: string }>();
  const appUrl = token ? `bonibuddy://invite/${token}` : "bonibuddy://";
  const hasToken = Boolean(token);

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full bg-brand-light/70 blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 py-8 min-h-screen flex flex-col">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-gray-900">
            <img
              src="/invite-logo-circle.png"
              alt="Boni Buddy"
              className="h-10 w-10 rounded-full object-cover"
            />
            Boni Buddy
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center py-16">
          <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-brand/10 p-7 md:p-10 text-center w-full max-w-lg">
            <img
              src="/invite-logo-circle.png"
              alt="Boni Buddy"
              className="mx-auto h-20 w-20 rounded-full object-cover shadow-[0_6px_16px_rgba(0,166,246,0.18)]"
            />
            <h1 className="mt-6 text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              {hasToken ? "Dodaj buddyja na Boni Buddy" : "Link ni popoln"}
            </h1>
            <p className="mt-4 text-gray-600 leading-relaxed">
              {hasToken
                ? "Najprej si namesti Boni Buddy. Ko je aplikacija nameščena, se vrni na ta link in ga odpri v aplikaciji, da potrdiš buddyja."
                : "Ta Boni Buddy link ni popoln. Prosi prijatelja, naj ti pošlje celoten link za dodajanje buddyja."}
            </p>

            {hasToken ? (
              <>
                <div className="mt-8 flex flex-col items-center gap-4">
                  <StoreButton
                    href={TESTFLIGHT_URL}
                    icon={<AppleStoreIcon />}
                    label="Naloži beta verzijo"
                    fixed
                  />
                  <StoreButton
                    icon={<GooglePlayIcon />}
                    label="Naloži na google play"
                    fixed
                  />
                </div>

                <div className="mt-7 border-t border-gray-100 pt-5">
                  <p className="text-sm font-medium text-gray-500">
                    Aplikacijo že imam
                  </p>
                  <a
                    href={appUrl}
                    className="mt-3 inline-flex h-[50px] w-[315px] max-w-full items-center justify-center gap-3 rounded-[20px] bg-brand px-4 text-[18px] font-bold text-white shadow-[0_2px_4px_#47bdef] transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_5px_10px_rgba(71,189,239,0.45)] sm:text-[23px]"
                  >
                    Odpri Boni Buddy
                    <ArrowRight size={18} />
                  </a>
                </div>
              </>
            ) : (
              <Link
                to="/"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-bold text-white hover:bg-brand-dark"
              >
                Nazaj na Boni Buddy
                <ArrowRight size={18} />
              </Link>
            )}

            {hasToken ? (
              <p className="mt-5 text-sm text-gray-500 leading-relaxed">
                Po namestitvi se vrni na sporočilo s tem linkom in ga odpri
                še enkrat.
              </p>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
