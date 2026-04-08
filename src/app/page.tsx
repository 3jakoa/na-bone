import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{background: "linear-gradient(160deg, #e0f4fd 0%, #c8e8f7 60%, #b8dff5 100%)"}}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-md ring-1 ring-brand/20 p-8">
        <img src="/mascot.svg" alt="Na Bone mascot" className="w-24 h-24 mx-auto mb-4 drop-shadow-md" />
        <h1 className="text-3xl font-extrabold mb-2 text-gray-900">Boni Buddy</h1>
        <p className="text-base text-gray-700 font-medium mb-1">
          Greš na bone? Ne rabš it sam 😎
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Swipaj, matchaj, pojdi jest.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-full px-4 text-base font-bold text-white transition-all hover:opacity-90 active:scale-95 h-12 shadow-md"
            style={{background: "linear-gradient(135deg, #44B5E5 0%, #5a9dc3 100%)"}}
          >
            Ustvari račun
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-full border-2 border-brand/40 bg-white px-4 text-base font-semibold text-brand-dark transition-colors hover:bg-brand-light h-12"
          >
            Prijava
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-6">
          Samo za registrirane študente 🎓
        </p>
      </div>
    </div>
  );
}
