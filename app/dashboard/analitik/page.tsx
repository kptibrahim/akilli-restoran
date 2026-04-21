import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

const adminDb = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AnalitikPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase.from("Restoran").select("id").eq("userId", user.id).single();
  const restoranId = restoran?.id ?? "";

  const { data: kategoriler } = await adminDb.from("Kategori").select("id").eq("restoranId", restoranId);
  const kategoriIds = (kategoriler ?? []).map((k: { id: string }) => k.id);

  const [{ data: chatLoglar }, { data: siparisler }, { data: urunler }] = await Promise.all([
    adminDb.from("ChatLog").select("*").eq("restoranId", restoranId).order("createdAt", { ascending: false }).limit(20),
    adminDb.from("Siparis").select("*").eq("restoranId", restoranId).order("createdAt", { ascending: false }).limit(100),
    kategoriIds.length > 0
      ? adminDb.from("Urun").select("id").in("kategoriId", kategoriIds)
      : Promise.resolve({ data: [] }),
  ]);

  const toplamCiro = (siparisler ?? []).reduce((acc: number, s: { toplam: number }) => acc + (s.toplam ?? 0), 0);

  const urunSayim: Record<string, { isim: string; adet: number }> = {};
  for (const s of siparisler ?? []) {
    for (const u of (s.urunler as Array<{ isim: string; adet: number }>) ?? []) {
      if (!u?.isim) continue;
      if (!urunSayim[u.isim]) urunSayim[u.isim] = { isim: u.isim, adet: 0 };
      urunSayim[u.isim].adet += u.adet ?? 1;
    }
  }
  const enCokSiparis = Object.values(urunSayim).sort((a, b) => b.adet - a.adet).slice(0, 5);
  const maxAdet = enCokSiparis[0]?.adet ?? 1;

  const istatistikler = [
    { label: "Toplam Sipariş", deger: (siparisler ?? []).length, ikon: "◳" },
    { label: "Toplam Ciro", deger: `₺${toplamCiro.toFixed(0)}`, ikon: "◈" },
    { label: "AI Konuşma", deger: (chatLoglar ?? []).length, ikon: "◉" },
    { label: "Menüdeki Ürün", deger: (urunler ?? []).length, ikon: "◎" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-3xl" style={{ paddingBottom: 100 }}>
      <div className="mb-7">
        <h1 className="text-2xl font-black" style={{ color: "var(--ast-text1)" }}>Analitik</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--ast-text2)" }}>Restoran performans özeti</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {istatistikler.map((ist) => (
          <div key={ist.label} className="rounded-2xl p-5"
            style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", boxShadow: "var(--ast-card-shadow)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3"
              style={{ background: "var(--ast-icon-bg)", color: "var(--ast-icon-color)" }}>
              {ist.ikon}
            </div>
            <p className="text-2xl font-black" style={{ color: "var(--ast-gold)" }}>{ist.deger}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--ast-text2)" }}>{ist.label}</p>
          </div>
        ))}
      </div>

      {/* En Çok Sipariş */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", boxShadow: "var(--ast-card-shadow)" }}>
        <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
          <span style={{ color: "var(--ast-gold)" }}>◈</span> En Çok Sipariş Edilen
        </h2>
        {enCokSiparis.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-sm" style={{ color: "var(--ast-text2)" }}>Henüz sipariş yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enCokSiparis.map((u, i) => (
              <div key={u.isim}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold w-4" style={{ color: "var(--ast-text3)" }}>{i + 1}</span>
                    <span className="text-sm font-medium" style={{ color: "var(--ast-text1)" }}>{u.isim}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: "var(--ast-gold)" }}>{u.adet} adet</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ast-divider)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(u.adet / maxAdet) * 100}%`, background: "linear-gradient(90deg, #C89434, #E8B84B)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Son AI Soruları */}
      <div className="rounded-2xl p-5"
        style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", boxShadow: "var(--ast-card-shadow)" }}>
        <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
          <span style={{ color: "var(--ast-gold)" }}>◉</span> Son AI Soruları
        </h2>
        {(chatLoglar ?? []).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm" style={{ color: "var(--ast-text2)" }}>Müşteriler henüz soru sormadı</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(chatLoglar as Array<{ id: string; soru: string; cevap: string; createdAt: string }>).map((log) => (
              <div key={log.id} className="rounded-xl p-3.5" style={{ border: "1px solid var(--ast-card-border)", background: "var(--ast-icon-bg)" }}>
                <p className="text-sm font-medium flex gap-2" style={{ color: "var(--ast-text1)" }}>
                  <span style={{ color: "var(--ast-gold)" }}>?</span>
                  <span>{log.soru}</span>
                </p>
                <p className="text-xs mt-1.5 line-clamp-2 ml-4" style={{ color: "var(--ast-text2)" }}>{log.cevap}</p>
                <p className="text-[10px] mt-1.5 ml-4" style={{ color: "var(--ast-text3)" }}>
                  {new Date(log.createdAt).toLocaleString("tr-TR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
