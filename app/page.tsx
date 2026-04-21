import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6">🍽️</div>
      <h1 className="text-4xl font-bold text-gray-800 mb-3">Akıllı Restoran</h1>
      <p className="text-gray-500 max-w-sm mb-10 text-lg">
        AI destekli QR menü sistemi. Restoranınızı dijital çağa taşıyın.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/dashboard"
          className="bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base hover:bg-orange-600 transition-colors"
        >
          İşletme Paneli
        </Link>
        <Link
          href="/demo"
          className="border-2 border-orange-500 text-orange-500 py-4 rounded-2xl font-semibold text-base hover:bg-orange-50 transition-colors"
        >
          Demo Restoranı Gör
        </Link>
      </div>
    </div>
  );
}
