"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";

type SepetUrun = { isim: string; adet: number; fiyat: number };
type Siparis = {
  id: string; masaNo: string; urunler: SepetUrun[];
  toplam: number; durum: string; notlar: string | null;
  createdAt: string; restoranId: string;
};

const DURUM_CONFIG: Record<string, {
  etiket: string;
  textVar: string;
  bgVar: string;
  borderVar: string;
  sonraki?: string;
  sonrakiEtiket?: string;
}> = {
  bekliyor:      { etiket: "⏳ Bekliyor",       textVar: "--ast-warn-text",    bgVar: "--ast-warn-bg",    borderVar: "--ast-warn-border",    sonraki: "hazirlaniyor", sonrakiEtiket: "Hazırla" },
  hazirlaniyor:  { etiket: "👨‍🍳 Hazırlanıyor", textVar: "--ast-nav-active-color", bgVar: "--ast-nav-active-bg", borderVar: "--ast-nav-active-border", sonraki: "hazir",        sonrakiEtiket: "Hazır" },
  hazir:         { etiket: "✅ Hazır",            textVar: "--ast-success-text", bgVar: "--ast-success-bg", borderVar: "--ast-success-border", sonraki: "teslim",       sonrakiEtiket: "Teslim" },
  teslim:        { etiket: "🚀 Teslim",           textVar: "--ast-text3",        bgVar: "--ast-badge-bg",   borderVar: "--ast-divider" },
};

function saatFormat(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function csvIndir(siparisler: Siparis[]) {
  const satirlar = [
    ["Saat", "Masa", "Ürünler", "Notlar", "Durum", "Toplam (₺)"],
    ...siparisler.map((s) => [
      saatFormat(s.createdAt),
      s.masaNo,
      s.urunler.map((u) => `${u.adet}x ${u.isim}`).join(" | "),
      s.notlar ?? "",
      DURUM_CONFIG[s.durum]?.etiket ?? s.durum,
      s.toplam.toFixed(2),
    ]),
  ];
  const icerik = satirlar.map((r) => r.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + icerik], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const tarih = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
  a.href = url;
  a.download = `siparisler-${tarih}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SiparislerPage() {
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [restoranId, setRestoranId] = useState<string | null>(null);

  const [arsivAcik, setArsivAcik] = useState(false);
  const [arsivSiparisler, setArsivSiparisler] = useState<Siparis[]>([]);
  const [arsivYukleniyor, setArsivYukleniyor] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("Restoran").select("id").eq("userId", user.id).single().then(({ data }) => {
        if (data) setRestoranId(data.id);
      });
    });
  }, []);

  const yukle = useCallback(async () => {
    if (!restoranId) return;
    try {
      const res = await fetch(`/api/siparis?restoranId=${restoranId}`);
      const data = await res.json();
      setSiparisler(data.siparisler ?? []);
    } finally {
      setYukleniyor(false);
    }
  }, [restoranId]);

  useEffect(() => {
    if (!restoranId) return;
    yukle();
    const interval = setInterval(yukle, 10000);
    return () => clearInterval(interval);
  }, [yukle, restoranId]);

  const arsivAc = useCallback(async () => {
    if (!restoranId) return;
    setArsivAcik(true);
    setArsivYukleniyor(true);
    // 24 saatten eski siparişleri otomatik sil
    fetch(`/api/siparis?restoranId=${restoranId}`, { method: "DELETE" });
    // Bugünün tüm siparişlerini çek
    const res = await fetch(`/api/siparis?restoranId=${restoranId}&arsiv=true`);
    const data = await res.json();
    setArsivSiparisler(data.siparisler ?? []);
    setArsivYukleniyor(false);
  }, [restoranId]);

  async function durumGuncelle(siparisId: string, durum: string) {
    await fetch("/api/siparis", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siparisId, durum }),
    });
    yukle();
  }

  const aktifSiparisler = siparisler.filter((s) => s.durum !== "teslim");

  // Arşiv özet istatistikleri
  const arsivToplam = arsivSiparisler.reduce((acc, s) => acc + s.toplam, 0);
  const arsivTeslim = arsivSiparisler.filter((s) => s.durum === "teslim").length;

  if (yukleniyor) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ast-bg)" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "var(--ast-gold)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--ast-text2)" }}>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10" style={{ paddingBottom: 100, background: "var(--ast-bg)", minHeight: "100vh" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--ast-text1)" }}>Aktif Siparişler</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ast-text2)" }}>{aktifSiparisler.length} sipariş</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={yukle}
            className="text-xs px-3 py-2 rounded-xl font-medium"
            style={{ border: "1px solid var(--ast-divider)", background: "var(--ast-card-bg)", color: "var(--ast-text2)" }}>
            ↻ Yenile
          </button>
          {/* Günlük Arşiv Butonu */}
          <button onClick={arsivAc}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl font-semibold transition-all"
            style={{ border: "1px solid var(--ast-gold)", background: "var(--ast-nav-active-bg)", color: "var(--ast-gold)" }}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
            Günlük Arşiv
          </button>
        </div>
      </div>

      {aktifSiparisler.length === 0 ? (
        <div className="text-center mt-24">
          <div className="text-6xl mb-4">🎉</div>
          <p className="font-medium" style={{ color: "var(--ast-text2)" }}>Bekleyen sipariş yok</p>
          <p className="text-sm mt-1" style={{ color: "var(--ast-text3)" }}>Yeni siparişler otomatik görünür</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aktifSiparisler.map((s) => {
            const d = DURUM_CONFIG[s.durum] ?? DURUM_CONFIG.bekliyor;
            return (
              <div key={s.id} className="rounded-2xl overflow-hidden"
                style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", boxShadow: "var(--ast-card-shadow)" }}>
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                  <span className="font-bold text-base" style={{ color: "var(--ast-text1)" }}>Masa {s.masaNo}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ color: `var(${d.textVar})`, background: `var(${d.bgVar})`, border: `1px solid var(${d.borderVar})` }}>
                    {d.etiket}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  {(s.urunler as SepetUrun[]).map((u, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span style={{ color: "var(--ast-text1)" }}>{u.adet}× {u.isim}</span>
                      <span style={{ color: "var(--ast-text2)" }}>₺{(u.fiyat * u.adet).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                {s.notlar && (
                  <div className="px-4 py-2" style={{ background: "var(--ast-warn-bg)", borderTop: "1px solid var(--ast-warn-border)" }}>
                    <p className="text-xs" style={{ color: "var(--ast-warn-text)" }}>📝 {s.notlar}</p>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: "1px solid var(--ast-divider)" }}>
                  <span className="font-bold" style={{ color: "var(--ast-text1)" }}>₺{s.toplam.toFixed(0)}</span>
                  {d.sonraki && (
                    <button onClick={() => durumGuncelle(s.id, d.sonraki!)}
                      className="text-xs px-4 py-2 rounded-xl font-semibold"
                      style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
                      {d.sonrakiEtiket}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Arşiv Overlay */}
      {arsivAcik && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Arka plan */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setArsivAcik(false)} />

          {/* Panel */}
          <div
            className="relative flex flex-col h-full w-full max-w-md"
            style={{ background: "var(--ast-bg)", borderLeft: "1px solid var(--ast-divider)", animation: "slideInRight 0.3s ease" }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--ast-divider)" }}>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="var(--ast-gold)" strokeWidth={2}>
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--ast-text1)" }}>Günlük Arşiv</p>
                  <p className="text-[10px]" style={{ color: "var(--ast-text3)" }}>Son 24 saat · otomatik silinir</p>
                </div>
              </div>
              <button onClick={() => setArsivAcik(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-lg"
                style={{ background: "var(--ast-card-bg)", color: "var(--ast-text2)" }}>×</button>
            </div>

            {/* İstatistik Özet */}
            {!arsivYukleniyor && arsivSiparisler.length > 0 && (
              <div className="grid grid-cols-3 gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                <div className="text-center">
                  <p className="text-lg font-black" style={{ color: "var(--ast-text1)" }}>{arsivSiparisler.length}</p>
                  <p className="text-[10px]" style={{ color: "var(--ast-text3)" }}>Toplam</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black" style={{ color: "var(--ast-success-text)" }}>{arsivTeslim}</p>
                  <p className="text-[10px]" style={{ color: "var(--ast-text3)" }}>Teslim</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black" style={{ color: "var(--ast-gold)" }}>₺{arsivToplam.toFixed(0)}</p>
                  <p className="text-[10px]" style={{ color: "var(--ast-text3)" }}>Ciro</p>
                </div>
              </div>
            )}

            {/* İndirme Butonu */}
            {!arsivYukleniyor && arsivSiparisler.length > 0 && (
              <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                <button
                  onClick={() => csvIndir(arsivSiparisler)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}
                >
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  CSV Olarak İndir
                </button>
              </div>
            )}

            {/* Sipariş Listesi */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {arsivYukleniyor ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--ast-gold)", borderTopColor: "transparent" }} />
                </div>
              ) : arsivSiparisler.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">📂</p>
                  <p className="text-sm" style={{ color: "var(--ast-text2)" }}>Henüz sipariş yok</p>
                  <p className="text-xs mt-1" style={{ color: "var(--ast-text3)" }}>Bugün gelen siparişler burada görünür</p>
                </div>
              ) : (
                arsivSiparisler.map((s) => {
                  const d = DURUM_CONFIG[s.durum] ?? DURUM_CONFIG.bekliyor;
                  return (
                    <div key={s.id} className="rounded-xl overflow-hidden"
                      style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)" }}>
                      <div className="flex items-center justify-between px-3 py-2.5"
                        style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color: "var(--ast-text1)" }}>Masa {s.masaNo}</span>
                          <span className="text-[10px]" style={{ color: "var(--ast-text3)" }}>{saatFormat(s.createdAt)}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ color: `var(${d.textVar})`, background: `var(${d.bgVar})` }}>
                          {d.etiket}
                        </span>
                      </div>
                      <div className="px-3 py-2 space-y-1">
                        {s.urunler.map((u, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span style={{ color: "var(--ast-text2)" }}>{u.adet}× {u.isim}</span>
                            <span style={{ color: "var(--ast-text3)" }}>₺{(u.fiyat * u.adet).toFixed(0)}</span>
                          </div>
                        ))}
                        {s.notlar && <p className="text-[10px] pt-1" style={{ color: "var(--ast-warn-text)" }}>📝 {s.notlar}</p>}
                      </div>
                      <div className="px-3 py-2 flex justify-end" style={{ borderTop: "1px solid var(--ast-divider)" }}>
                        <span className="text-xs font-bold" style={{ color: "var(--ast-text1)" }}>₺{s.toplam.toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
