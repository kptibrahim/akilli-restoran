"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";

function trFix(str: string) {
  return str
    .replace(/ğ/g, "g").replace(/Ğ/g, "G")
    .replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .replace(/ü/g, "u").replace(/Ü/g, "U")
    .replace(/ö/g, "o").replace(/Ö/g, "O")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/₺/g, "TL");
}

type SepetUrun = { isim: string; adet: number; fiyat: number };

type KasaKayit = {
  id: string;
  restoranId: string;
  siparisId: string | null;
  masaNo: string;
  urunler: SepetUrun[];
  toplam: number;
  not: string | null;
  odendi: boolean;
  odendiTarih: string | null;
  odemeYontemi: string | null;
  createdAt: string;
};

type MasaGrubu = {
  masaNo: string;
  kayitlar: KasaKayit[];
  toplamTutar: number;
  birlesikUrunler: SepetUrun[];
  ilkCreated: string;
};

type OdemeYontemi = "nakit" | "kart" | "yemek-ceki" | "diger";

function saatFormat(iso: string, tz: string) {
  const s = iso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(s).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
}

function grupla(kayitlar: KasaKayit[]): MasaGrubu[] {
  const harita = new Map<string, KasaKayit[]>();
  for (const k of kayitlar) {
    if (!harita.has(k.masaNo)) harita.set(k.masaNo, []);
    harita.get(k.masaNo)!.push(k);
  }
  return Array.from(harita.entries()).map(([masaNo, liste]) => {
    const urunMap = new Map<string, SepetUrun>();
    for (const k of liste) {
      for (const u of k.urunler) {
        if (urunMap.has(u.isim)) {
          urunMap.get(u.isim)!.adet += u.adet;
        } else {
          urunMap.set(u.isim, { ...u });
        }
      }
    }
    const sirali = [...liste].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      masaNo,
      kayitlar: liste,
      toplamTutar: liste.reduce((acc, k) => acc + k.toplam, 0),
      birlesikUrunler: Array.from(urunMap.values()),
      ilkCreated: sirali[0].createdAt,
    };
  });
}

// ── İndirme fonksiyonları (aynen korundu) ──

function csvIndirKasa(arsiv: KasaKayit[], tz: string) {
  const satirlar = [
    ["Ödeme Saati", "Masa", "Yöntem", "Ürünler", "Notlar", "Toplam (₺)"],
    ...arsiv.map((k) => [
      saatFormat(k.odendiTarih ?? k.createdAt, tz),
      k.masaNo,
      k.odemeYontemi ?? "",
      k.urunler.map((u) => `${u.adet}x ${u.isim}`).join(" | "),
      k.not ?? "",
      k.toplam.toFixed(2),
    ]),
  ];
  const icerik = satirlar.map((r) => r.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + icerik], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const tarih = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
  a.href = url;
  a.download = `kasa-${tarih}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function pdfIndirKasa(arsiv: KasaKayit[], tz: string) {
  const { jsPDF } = await import("jspdf");
  const tarih = new Date().toLocaleDateString("tr-TR");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(trFix(`Kasa Arsivi - ${tarih}`), 14, 16);

  const cols = [
    { label: "Odeme", w: 25 },
    { label: "Masa", w: 28 },
    { label: "Yontem", w: 25 },
    { label: "Urunler", w: 95 },
    { label: "Notlar", w: 50 },
    { label: "Toplam", w: 30 },
  ];
  const totalW = cols.reduce((a, c) => a + c.w, 0);
  let y = 26;

  doc.setFillColor(200, 148, 52);
  doc.rect(14, y, totalW, 8, "F");
  doc.setFontSize(9);
  doc.setTextColor(10, 7, 5);
  let x = 14;
  cols.forEach((c) => { doc.text(c.label, x + 2, y + 5.5); x += c.w; });
  y += 9;

  arsiv.forEach((k, idx) => {
    if (y > 185) { doc.addPage(); y = 15; }
    doc.setFillColor(idx % 2 === 0 ? 245 : 235, idx % 2 === 0 ? 242 : 240, idx % 2 === 0 ? 238 : 236);
    doc.rect(14, y, totalW, 7.5, "F");
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    const row = [
      saatFormat(k.odendiTarih ?? k.createdAt, tz),
      trFix(k.masaNo),
      trFix(k.odemeYontemi ?? ""),
      trFix(k.urunler.map((u) => `${u.adet}x ${u.isim}`).join(", ")),
      trFix(k.not ?? ""),
      `TL${k.toplam.toFixed(2)}`,
    ];
    x = 14;
    row.forEach((cell, i) => {
      const lines = doc.splitTextToSize(String(cell), cols[i].w - 3);
      doc.text(lines[0], x + 2, y + 5);
      x += cols[i].w;
    });
    y += 8;
  });

  y += 4;
  const ciro = arsiv.reduce((a, k) => a + k.toplam, 0);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 148, 52);
  doc.text(`Toplam Ciro: TL${ciro.toFixed(2)}`, 14, y);
  doc.save(`kasa-${tarih.replace(/\./g, "-")}.pdf`);
}

function pngIndirKasa(arsiv: KasaKayit[], tz: string) {
  const pad = 28;
  const cols = [
    { label: "Ödeme Saati", w: 100 },
    { label: "Masa", w: 80 },
    { label: "Yöntem", w: 90 },
    { label: "Ürünler", w: 300 },
    { label: "Notlar", w: 150 },
    { label: "Toplam", w: 80 },
  ];
  const totalW = cols.reduce((a, c) => a + c.w, 0) + pad * 2;
  const rowH = 38;
  const headH = 44;
  const titleH = 58;
  const footH = 46;
  const totalH = titleH + headH + arsiv.length * rowH + footH + pad;
  const sc = 2;
  const canvas = document.createElement("canvas");
  canvas.width = totalW * sc;
  canvas.height = totalH * sc;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(sc, sc);

  ctx.fillStyle = "#0A0705";
  ctx.fillRect(0, 0, totalW, totalH);
  ctx.fillStyle = "#E8B84B";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.fillText("Kasa Arsivi", pad, 36);
  ctx.fillStyle = "#888";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(new Date().toLocaleDateString("tr-TR"), pad, 52);

  ctx.fillStyle = "#C89434";
  ctx.fillRect(pad, titleH, totalW - pad * 2, headH);
  let px = pad;
  ctx.fillStyle = "#0A0705";
  ctx.font = "bold 12px system-ui, sans-serif";
  cols.forEach((c) => { ctx.fillText(c.label, px + 8, titleH + 28); px += c.w; });

  arsiv.forEach((k, idx) => {
    const ry = titleH + headH + idx * rowH;
    ctx.fillStyle = idx % 2 === 0 ? "#151210" : "#1c1612";
    ctx.fillRect(pad, ry, totalW - pad * 2, rowH);
    const row = [
      saatFormat(k.odendiTarih ?? k.createdAt, tz),
      k.masaNo,
      k.odemeYontemi ?? "",
      k.urunler.map((u) => `${u.adet}x ${u.isim}`).join(", "),
      k.not ?? "",
      `₺${k.toplam.toFixed(0)}`,
    ];
    px = pad;
    ctx.fillStyle = "#d9cfc4";
    ctx.font = "12px system-ui, sans-serif";
    row.forEach((cell, i) => {
      const maxCh = Math.floor((cols[i].w - 16) / 7.2);
      const txt = cell.length > maxCh ? cell.slice(0, maxCh - 1) + "…" : cell;
      ctx.fillText(txt, px + 8, ry + 24);
      px += cols[i].w;
    });
  });

  const fy = titleH + headH + arsiv.length * rowH;
  ctx.fillStyle = "#1e1a16";
  ctx.fillRect(pad, fy, totalW - pad * 2, footH);
  const ciro = arsiv.reduce((a, k) => a + k.toplam, 0);
  ctx.fillStyle = "#E8B84B";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillText(`Toplam Ciro: ₺${ciro.toFixed(0)}  ·  ${arsiv.length} odeme`, pad + 10, fy + 28);

  const tarih = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
  const a = document.createElement("a");
  a.download = `kasa-${tarih}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

// ── Ana Component ──

const YONTEM_ETIKET: Record<OdemeYontemi, string> = {
  nakit: "💵 Nakit",
  kart: "💳 Kart",
  "yemek-ceki": "🎫 Yemek Çeki",
  diger: "🔄 Diğer",
};

export default function KasaClient() {
  const [restoranId, setRestoranId] = useState<string | null>(null);
  const [tz, setTz] = useState("Europe/Istanbul");
  const [kayitlar, setKayitlar] = useState<KasaKayit[]>([]);
  const [arsiv, setArsiv] = useState<KasaKayit[]>([]);
  const [arama, setArama] = useState("");
  const [arsivAcik, setArsivAcik] = useState(false);
  const [ready, setReady] = useState(false);

  // Ödeme modal
  const [modalMasa, setModalMasa] = useState<string | null>(null);
  const [seciliYontem, setSeciliYontem] = useState<OdemeYontemi>("nakit");
  const [odemeYukleniyor, setOdemeYukleniyor] = useState(false);

  // restoranId al
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("Restoran").select("id, timezone").eq("userId", user.id).single().then(({ data }) => {
        if (data) {
          setRestoranId(data.id);
          setTz((data.timezone as string | null) ?? "Europe/Istanbul");
        }
      });
    });
  }, []);

  // Bekleyenleri yükle
  const yukle = useCallback(async () => {
    if (!restoranId) return;
    const res = await fetch(`/api/odeme-arsiv?odendi=false`);
    if (!res.ok) return;
    const data = await res.json();
    setKayitlar(data.kayitlar ?? []);
    setReady(true);
  }, [restoranId]);

  useEffect(() => {
    if (!restoranId) return;
    yukle();
  }, [yukle, restoranId]);

  // 30 saniyede bir polling
  useEffect(() => {
    if (!restoranId) return;
    const t = setInterval(yukle, 30000);
    return () => clearInterval(t);
  }, [restoranId, yukle]);

  // localStorage migration (tek seferlik)
  useEffect(() => {
    if (!restoranId) return;
    const eskiKasa = localStorage.getItem("gastronom_kasa");
    const eskiArsiv = localStorage.getItem("gastronom_kasa_arsiv");
    if (!eskiKasa && !eskiArsiv) return;

    fetch("/api/odeme-arsiv/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bekleyenler: JSON.parse(eskiKasa || "[]"),
        arsiv: JSON.parse(eskiArsiv || "[]"),
      }),
    }).then((r) => {
      if (r.ok) {
        localStorage.removeItem("gastronom_kasa");
        localStorage.removeItem("gastronom_kasa_arsiv");
        yukle();
      }
    }).catch(() => {});
  }, [restoranId, yukle]);

  // Arşiv yükle (drawer açıldığında)
  const arsivYukle = useCallback(async () => {
    if (!restoranId) return;
    const res = await fetch(`/api/odeme-arsiv?odendi=true&donem=gunluk`);
    if (!res.ok) return;
    const data = await res.json();
    setArsiv(data.kayitlar ?? []);
  }, [restoranId]);

  useEffect(() => {
    if (arsivAcik) arsivYukle();
  }, [arsivAcik, arsivYukle]);

  // Ödeme al — modal aç
  function odemeAlBasla(masaNo: string) {
    setModalMasa(masaNo);
    setSeciliYontem("nakit");
  }

  // Ödeme onayla
  async function odemeOnayla() {
    if (!modalMasa) return;
    const grup = gruplar.find((g) => g.masaNo === modalMasa);
    if (!grup) return;

    setOdemeYukleniyor(true);
    try {
      await Promise.all(
        grup.kayitlar.map((k) =>
          fetch(`/api/odeme-arsiv/${k.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ odemeYontemi: seciliYontem }),
          })
        )
      );
      // Realtime günceller ama fallback olarak local state de güncelle
      setKayitlar((prev) => prev.filter((r) => r.masaNo !== modalMasa));
    } finally {
      setOdemeYukleniyor(false);
      setModalMasa(null);
    }
  }

  const gruplar = grupla(kayitlar);
  const aramaTemiz = arama.trim().toLowerCase();
  const filtreliGruplar = aramaTemiz
    ? gruplar.filter(
        (g) =>
          g.masaNo.toLowerCase().includes(aramaTemiz) ||
          g.birlesikUrunler.some((u) => u.isim.toLowerCase().includes(aramaTemiz))
      )
    : gruplar;
  const filtreliArsiv = aramaTemiz
    ? arsiv.filter(
        (k) =>
          k.masaNo.toLowerCase().includes(aramaTemiz) ||
          k.urunler.some((u) => u.isim.toLowerCase().includes(aramaTemiz))
      )
    : [];

  const bekleyenToplam = gruplar.reduce((a, g) => a + g.toplamTutar, 0);
  const arsivCiro = arsiv.reduce((a, k) => a + k.toplam, 0);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ast-bg)" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--ast-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10" style={{ paddingBottom: 100, background: "var(--ast-bg)", minHeight: "100vh" }}>

      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--ast-text1)" }}>Kasa</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--ast-text2)" }}>
            {gruplar.length > 0
              ? `${gruplar.length} masa bekliyor · ₺${bekleyenToplam.toFixed(0)} toplam`
              : "Bekleyen masa yok"}
          </p>
        </div>
        <button
          onClick={() => setArsivAcik(true)}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl font-semibold"
          style={{ border: "1px solid var(--ast-gold)", background: "var(--ast-nav-active-bg)", color: "var(--ast-gold)" }}
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
          Günlük Arşiv
        </button>
      </div>

      {/* Arama */}
      <div className="relative mb-6">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}
          style={{ color: "var(--ast-text3)" }}>
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Masa no veya ürün adı ara... (örn: bonfile, 3)"
          className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm outline-none"
          style={{
            background: "var(--ast-card-bg)",
            border: "1px solid var(--ast-card-border)",
            color: "var(--ast-text1)",
          }}
        />
        {arama && (
          <button
            onClick={() => setArama("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-xs"
            style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text3)" }}
          >×</button>
        )}
      </div>

      {/* İçerik */}
      {gruplar.length === 0 && !aramaTemiz ? (
        <div className="text-center mt-24">
          <div className="text-6xl mb-4">💰</div>
          <p className="font-medium" style={{ color: "var(--ast-text2)" }}>Kasada bekleyen masa yok</p>
          <p className="text-sm mt-1" style={{ color: "var(--ast-text3)" }}>Teslim edilen siparişler burada görünür</p>
        </div>
      ) : filtreliGruplar.length === 0 && filtreliArsiv.length === 0 ? (
        <div className="text-center mt-16">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-sm" style={{ color: "var(--ast-text2)" }}>&quot;{arama}&quot; ile eşleşen sonuç yok</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtreliGruplar.map((g) => (
            <div key={g.masaNo} className="rounded-2xl overflow-hidden"
              style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", boxShadow: "var(--ast-card-shadow)" }}>

              {/* Kart Başlık */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base" style={{ color: "var(--ast-text1)" }}>
                    Masa {g.masaNo}
                  </span>
                  {g.kayitlar.length > 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text3)" }}>
                      {g.kayitlar.length} sipariş
                    </span>
                  )}
                </div>
                <span className="text-xs" style={{ color: "var(--ast-text3)" }}>
                  {saatFormat(g.ilkCreated, tz)}
                </span>
              </div>

              {/* Ürünler */}
              <div className="px-4 py-3 space-y-3">
                {g.kayitlar.map((k, ki) => (
                  <div key={k.id}>
                    {ki > 0 && <div style={{ borderTop: "1px dashed var(--ast-divider)", marginBottom: 10 }} />}
                    <div className="space-y-1.5">
                      {k.urunler.map((u, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span style={{ color: "var(--ast-text1)" }}>{u.adet}× {u.isim}</span>
                          <span style={{ color: "var(--ast-text2)" }}>₺{(u.fiyat * u.adet).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                    {k.not && (
                      <p className="text-xs mt-1.5" style={{ color: "var(--ast-warn-text)" }}>📝 {k.not}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Alt Bar */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: "1px solid var(--ast-divider)" }}>
                <span className="font-black text-xl" style={{ color: "var(--ast-gold)" }}>
                  ₺{g.toplamTutar.toFixed(0)}
                </span>
                <button
                  onClick={() => odemeAlBasla(g.masaNo)}
                  className="px-5 py-2.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)", color: "#fff" }}
                >
                  ✓ Ödeme Alındı
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Arşiv arama sonuçları */}
        {filtreliArsiv.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="var(--ast-gold)" strokeWidth={2}>
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
              <span className="text-xs font-bold" style={{ color: "var(--ast-text3)" }}>
                Arşivde {filtreliArsiv.length} sonuç
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...filtreliArsiv].reverse().map((k, i) => (
                <div key={k.id + i} className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", opacity: 0.8 }}>
                  <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base" style={{ color: "var(--ast-text1)" }}>Masa {k.masaNo}</span>
                      <span className="text-[10px]" style={{ color: "var(--ast-text3)" }}>{saatFormat(k.odendiTarih ?? k.createdAt, tz)}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "var(--ast-success-bg)", color: "var(--ast-success-text)" }}>
                      {k.odemeYontemi ? YONTEM_ETIKET[k.odemeYontemi as OdemeYontemi] ?? k.odemeYontemi : "Ödendi"}
                    </span>
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
                    {k.urunler.map((u, j) => (
                      <div key={j} className="flex justify-between text-sm">
                        <span style={{ color: "var(--ast-text1)" }}>{u.adet}× {u.isim}</span>
                        <span style={{ color: "var(--ast-text2)" }}>₺{(u.fiyat * u.adet).toFixed(0)}</span>
                      </div>
                    ))}
                    {k.not && <p className="text-xs pt-1" style={{ color: "var(--ast-warn-text)" }}>📝 {k.not}</p>}
                  </div>
                  <div className="flex justify-end px-4 py-3" style={{ borderTop: "1px solid var(--ast-divider)" }}>
                    <span className="font-black text-xl" style={{ color: "var(--ast-gold)" }}>₺{k.toplam.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
      )}

      {/* Ödeme Modal */}
      {modalMasa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !odemeYukleniyor && setModalMasa(null)} />
          <div className="relative rounded-2xl p-6 w-full max-w-sm"
            style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)" }}>
            <h2 className="text-lg font-black mb-1" style={{ color: "var(--ast-text1)" }}>
              Masa {modalMasa} — Ödeme
            </h2>
            <p className="text-xs mb-5" style={{ color: "var(--ast-text3)" }}>
              Toplam: ₺{gruplar.find((g) => g.masaNo === modalMasa)?.toplamTutar.toFixed(0)}
            </p>

            <p className="text-xs font-semibold mb-3" style={{ color: "var(--ast-text2)" }}>Ödeme Yöntemi</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {(Object.entries(YONTEM_ETIKET) as [OdemeYontemi, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSeciliYontem(key)}
                  className="py-3 px-4 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: seciliYontem === key ? "var(--ast-nav-active-bg)" : "var(--ast-badge-bg)",
                    border: `1px solid ${seciliYontem === key ? "var(--ast-gold)" : "var(--ast-divider)"}`,
                    color: seciliYontem === key ? "var(--ast-gold)" : "var(--ast-text2)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalMasa(null)}
                disabled={odemeYukleniyor}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text2)", border: "1px solid var(--ast-divider)" }}
              >
                İptal
              </button>
              <button
                onClick={odemeOnayla}
                disabled={odemeYukleniyor}
                className="flex-1 py-3 rounded-xl text-sm font-black transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)", color: "#fff" }}
              >
                {odemeYukleniyor ? "..." : "✓ Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Günlük Arşiv Drawer */}
      {arsivAcik && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setArsivAcik(false)} />
          <div className="relative flex flex-col h-full w-full max-w-md"
            style={{ background: "var(--ast-bg)", borderLeft: "1px solid var(--ast-divider)", animation: "slideInRight 0.3s ease" }}>

            {/* Arşiv Başlık */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--ast-divider)" }}>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="var(--ast-gold)" strokeWidth={2}>
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--ast-text1)" }}>Kasa Arşivi</p>
                  <p className="text-[10px]" style={{ color: "var(--ast-text3)" }}>Son 24 saat · otomatik silinir</p>
                </div>
              </div>
              <button onClick={() => setArsivAcik(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-lg"
                style={{ background: "var(--ast-card-bg)", color: "var(--ast-text2)" }}>×</button>
            </div>

            {/* Özet */}
            {arsiv.length > 0 && (
              <div className="grid grid-cols-2 gap-3 px-5 py-3"
                style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                <div className="text-center">
                  <p className="text-lg font-black" style={{ color: "var(--ast-text1)" }}>{arsiv.length}</p>
                  <p className="text-[10px]" style={{ color: "var(--ast-text3)" }}>Ödeme</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black" style={{ color: "var(--ast-gold)" }}>₺{arsivCiro.toFixed(0)}</p>
                  <p className="text-[10px]" style={{ color: "var(--ast-text3)" }}>Ciro</p>
                </div>
              </div>
            )}

            {/* İndirme Butonları */}
            {arsiv.length > 0 && (
              <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--ast-text3)" }}>Arşivi İndir</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "CSV", fn: () => csvIndirKasa(arsiv, tz) },
                    { label: "PDF", fn: () => pdfIndirKasa(arsiv, tz) },
                    { label: "PNG", fn: () => pngIndirKasa(arsiv, tz) },
                  ].map(({ label, fn }) => (
                    <button key={label} onClick={fn}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
                      style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", color: "var(--ast-text1)" }}>
                      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Arşiv Listesi */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {arsiv.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">💰</p>
                  <p className="text-sm" style={{ color: "var(--ast-text2)" }}>Henüz ödeme yok</p>
                  <p className="text-xs mt-1" style={{ color: "var(--ast-text3)" }}>Bugün alınan ödemeler burada görünür</p>
                </div>
              ) : (
                [...arsiv].reverse().map((k, i) => (
                  <div key={k.id + i} className="rounded-xl overflow-hidden"
                    style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)" }}>
                    <div className="flex items-center justify-between px-3 py-2.5"
                      style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: "var(--ast-text1)" }}>Masa {k.masaNo}</span>
                        <span className="text-[10px]" style={{ color: "var(--ast-text3)" }}>{saatFormat(k.odendiTarih ?? k.createdAt, tz)}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "var(--ast-success-bg)", color: "var(--ast-success-text)" }}>
                        {k.odemeYontemi ? YONTEM_ETIKET[k.odemeYontemi as OdemeYontemi] ?? k.odemeYontemi : "Ödendi"}
                      </span>
                    </div>
                    <div className="px-3 py-2 space-y-1">
                      {k.urunler.map((u, j) => (
                        <div key={j} className="flex justify-between text-xs">
                          <span style={{ color: "var(--ast-text2)" }}>{u.adet}× {u.isim}</span>
                          <span style={{ color: "var(--ast-text3)" }}>₺{(u.fiyat * u.adet).toFixed(0)}</span>
                        </div>
                      ))}
                      {k.not && <p className="text-[10px] pt-1" style={{ color: "var(--ast-warn-text)" }}>📝 {k.not}</p>}
                    </div>
                    <div className="px-3 py-2 flex justify-end" style={{ borderTop: "1px solid var(--ast-divider)" }}>
                      <span className="text-xs font-bold" style={{ color: "var(--ast-text1)" }}>₺{k.toplam.toFixed(0)}</span>
                    </div>
                  </div>
                ))
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
