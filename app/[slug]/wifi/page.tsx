import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function WifiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: restoran } = await db
    .from("Restoran")
    .select("isim, renk, wifiAdi, wifiSifre")
    .eq("slug", slug)
    .eq("aktif", true)
    .single();

  if (!restoran || !restoran.wifiAdi) notFound();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-4 py-4 text-white" style={{ backgroundColor: restoran.renk }}>
        <h1 className="font-bold text-lg">{restoran.isim} — Wi-Fi</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-6xl">📶</div>
        <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Ağ Adı (SSID)</p>
            <p className="font-semibold text-gray-800 text-lg">{restoran.wifiAdi}</p>
          </div>
          {restoran.wifiSifre && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Şifre</p>
              <p className="font-bold text-2xl tracking-widest" style={{ color: restoran.renk }}>
                {restoran.wifiSifre}
              </p>
            </div>
          )}
        </div>
        <p className="text-gray-400 text-sm text-center">Ayarlar &gt; Wi-Fi menüsünden bağlanabilirsiniz.</p>
      </div>
    </div>
  );
}
