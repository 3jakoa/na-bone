import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-rose-50 to-orange-100 px-4 text-center">
      <div className="max-w-sm">
        <div className="text-7xl mb-6">🍽️</div>
        <h1 className="text-4xl font-bold mb-3 text-gray-900">Na Bone</h1>
        <p className="text-lg text-gray-600 mb-2">
          Tinder za slovenske študente, ki gredo na subvencijo.
        </p>
        <p className="text-sm text-gray-400 mb-8">
          Swipaj, matchaj, pojdi jest.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 text-lg font-medium text-white transition-colors hover:bg-orange-600 h-12"
          >
            Začni brezplačno
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 h-12"
          >
            Prijava
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-6">
          Samo za registrirane slovenske študente ✓
        </p>
      </div>
    </div>
  );
}
