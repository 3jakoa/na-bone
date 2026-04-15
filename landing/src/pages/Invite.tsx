import { Link, useParams } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";

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
            <img src="/mascot.svg" alt="Boni Buddy" className="h-8 w-auto" />
            Boni Buddy
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center py-16">
          <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-brand/10 p-8 md:p-10 text-center w-full max-w-lg">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-light text-brand-dark flex items-center justify-center">
              <Users size={30} />
            </div>
            <h1 className="mt-6 text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              {hasToken ? "Povabilo za buddyja" : "Manjka koda povabila"}
            </h1>
            <p className="mt-4 text-gray-600 leading-relaxed">
              {hasToken
                ? "Nekdo te je povabil, da postaneta buddyja na Boni Buddy. Odpri povezavo v aplikaciji, sprejmi povabilo in se dogovorita za bone."
                : "Odpri celoten invite link, ki vsebuje kodo povabila za /invite/."}
            </p>

            {hasToken ? (
              <a
                href={appUrl}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-bold text-white hover:bg-brand-dark"
              >
                Odpri v aplikaciji
                <ArrowRight size={18} />
              </a>
            ) : (
              <Link
                to="/"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-bold text-white hover:bg-brand-dark"
              >
                Nazaj na Boni Buddy
                <ArrowRight size={18} />
              </Link>
            )}

            <p className="mt-5 text-sm text-gray-500 leading-relaxed">
              Če se aplikacija ne odpre, namesti Boni Buddy in nato ponovno
              odpri ta link.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
