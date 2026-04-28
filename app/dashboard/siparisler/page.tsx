"use client";

import { useEffect, useState, useCallback } from "react";
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

function saatFormat(iso: string, tz: string) {
  const s = iso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(s).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
}

function csvIndir(siparisler: Siparis[], tz: string) {
  const satirlar = [
    ["Saat", "Masa", "Ürünler", "Notlar", "Durum", "Toplam (₺)"],
    ...siparisler.map((s) => [
      saatFormat(s.createdAt, tz),
      s.masaNo,
      s.urunler.map((u) => `${u.adet}x ${u.isim}`).join(" | "),
      s.notlar ?? "",
      DURUM_CONFIG[s.durum]?.etiket ?? s.durum,
      s.toplam.toFixed(2),
    ]),
  ];
  const icerik = satirlar.map((r) => r.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + icerik], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const tarih = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
  a.href = url;
  a.download = `siparisler-${tarih}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function pdfIndir(siparisler: Siparis[], tz: string) {
  const { jsPDF } = await import("jspdf");
  const tarih = new Date().toLocaleDateString("tr-TR");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(trFix(`Gunluk Siparis Arsivi - ${tarih}`), 14, 16);

  const cols = [
    { label: "Saat", w: 22 },
    { label: "Masa", w: 28 },
    { label: "Urunler", w: 110 },
    { label: "Notlar", w: 50 },
    { label: "Durum", w: 28 },
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

  siparisler.forEach((s, idx) => {
    if (y > 185) { doc.addPage(); y = 15; }
    doc.setFillColor(idx % 2 === 0 ? 245 : 235, idx % 2 === 0 ? 242 : 240, idx % 2 === 0 ? 238 : 236);
    doc.rect(14, y, totalW, 7.5, "F");
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal");
    const durum = trFix((DURUM_CONFIG[s.durum]?.etiket ?? s.durum).replace(/[^\w\s\-.,]/g, ""));
    const row = [
      saatFormat(s.createdAt, tz),
      trFix(s.masaNo),
      trFix(s.urunler.map((u) => `${u.adet}x ${u.isim}`).join(", ")),
      trFix(s.notlar ?? ""),
      durum,
      `TL${s.toplam.toFixed(2)}`,
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
  const ciro = siparisler.reduce((a, s) => a + s.toplam, 0);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 148, 52);
  doc.text(`Toplam Ciro: TL${ciro.toFixed(2)}`, 14, y);
  doc.save(`siparisler-${tarih.replace(/\./g, "-")}.pdf`);
}

function pngIndir(siparisler: Siparis[], tz: string) {
  const pad = 28;
  const cols = [
    { label: "Saat", w: 72 },
    { label: "Masa", w: 86 },
    { label: "Ürünler", w: 330 },
    { label: "Notlar", w: 160 },
    { label: "Durum", w: 110 },
    { label: "Toplam", w: 80 },
  ];
  const totalW = cols.reduce((a, c) => a + c.w, 0) + pad * 2;
  const rowH = 38;
  const headH = 44;
  const titleH = 58;
  const footH = 46;
  const totalH = titleH + headH + siparisler.length * rowH + footH + pad;
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
  ctx.fillText("Günlük Sipariş Arşivi", pad, 36);
  ctx.fillStyle = "#888";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(new Date().toLocaleDateString("tr-TR"), pad, 52);

  ctx.fillStyle = "#C89434";
  ctx.fillRect(pad, titleH, totalW - pad * 2, headH);
  let px = pad;
  ctx.fillStyle = "#0A0705";
  ctx.font = "bold 12px system-ui, sans-serif";
  cols.forEach((c) => { ctx.fillText(c.label, px + 8, titleH + 28); px += c.w; });

  siparisler.forEach((s, idx) => {
    const ry = titleH + headH + idx * rowH;
    ctx.fillStyle = idx % 2 === 0 ? "#151210" : "#1c1612";
    ctx.fillRect(pad, ry, totalW - pad * 2, rowH);
    const row = [
      saatFormat(s.createdAt, tz),
      s.masaNo,
      s.urunler.map((u) => `${u.adet}x ${u.isim}`).join(", "),
      s.notlar ?? "",
      (DURUM_CONFIG[s.durum]?.etiket ?? s.durum).replace(/[^\w\s\-.,ğşıüöçĞŞİÜÖÇ]/g, ""),
      `₺${s.toplam.toFixed(0)}`,
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

  const fy = titleH + headH + siparisler.length * rowH;
  ctx.fillStyle = "#1e1a16";
  ctx.fillRect(pad, fy, totalW - pad * 2, footH);
  const ciro = siparisler.reduce((a, s) => a + s.toplam, 0);
  ctx.fillStyle = "#E8B84B";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillText(`Toplam Ciro: ₺${ciro.toFixed(0)}  ·  ${siparisler.length} siparis`, pad + 10, fy + 28);

  const tarih = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
  const a = document.createElement("a");
  a.download = `siparisler-${tarih}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

export default function SiparislerPage() {
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [restoranId, setRestoranId] = useState<string | null>(null);
  const [tz, setTz] = useState("Europe/Istanbul");

  const [arsivAcik, setArsivAcik] = useState(false);
  const [arsivSiparisler, setArsivSiparisler] = useState<Siparis[]>([]);
  const [arsivYukleniyor, setArsivYukleniyor] = useState(false);

  const [simdi, setSimdi] = useState(Date.now());

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
  }, [yukle, restoranId]);

  // 30 saniyede bir polling
  useEffect(() => {
    if (!restoranId) return;
    const t = setInterval(yukle, 30000);
    return () => clearInterval(t);
  }, [restoranId, yukle]);

  // Her saniye güncelle → kart renk/süre hesabı için
  useEffect(() => {
    const t = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const arsivAc = useCallback(async () => {
    if (!restoranId) return;
    setArsivAcik(true);
    setArsivYukleniyor(true);
    fetch(`/api/siparis?restoranId=${restoranId}`, { method: "DELETE" });
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
    if (durum === "teslim") {
      const siparis = siparisler.find((s) => s.id === siparisId);
      if (siparis) {
        // Cloud: OdemeArsiv kaydı oluştur
        fetch("/api/odeme-arsiv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siparisId: siparis.id,
            masaNo: siparis.masaNo,
            urunler: siparis.urunler,
            toplam: siparis.toplam,
            not: siparis.notlar,
          }),
        }).catch(() => {});
      }
    }
    yukle();
  }

  const aktifSiparisler = siparisler.filter((s) => s.durum !== "teslim");

  const DURUM_SIRA = ["bekliyor", "hazirlaniyor", "hazir", "teslim"];

  type MasaGrubu = {
    masaNo: string;
    siparisler: Siparis[];
    toplam: number;
    durum: string;
  };

  const masaGruplari: MasaGrubu[] = Array.from(
    aktifSiparisler.reduce((map, s) => {
      if (!map.has(s.masaNo)) map.set(s.masaNo, []);
      map.get(s.masaNo)!.push(s);
      return map;
    }, new Map<string, Siparis[]>())
  ).map(([masaNo, list]) => {
    const minIdx = Math.min(...list.map((s) => DURUM_SIRA.indexOf(s.durum)).filter((i) => i >= 0));
    return {
      masaNo,
      siparisler: list,
      toplam: list.reduce((a, s) => a + s.toplam, 0),
      durum: DURUM_SIRA[minIdx] ?? "bekliyor",
    };
  });

  async function grupDurumGuncelle(grup: MasaGrubu, sonrakiDurum: string) {
    await Promise.all(grup.siparisler.map((s) => durumGuncelle(s.id, sonrakiDurum)));
  }

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
          <p className="text-xs mt-0.5" style={{ color: "var(--ast-text2)" }}>{masaGruplari.length} masa · {aktifSiparisler.length} sipariş</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tam ekran */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen();
              else document.exitFullscreen();
            }}
            className="text-sm px-2.5 py-2 rounded-xl"
            style={{ border: "1px solid var(--ast-divider)", background: "var(--ast-card-bg)", color: "var(--ast-text2)" }}
            title="Tam ekran">
            ⛶
          </button>
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
          {masaGruplari.map((grup) => {
            const d = DURUM_CONFIG[grup.durum] ?? DURUM_CONFIG.bekliyor;
            const enErken = grup.siparisler.reduce(
              (min, s) => (s.createdAt < min ? s.createdAt : min),
              grup.siparisler[0].createdAt
            );
            const dk = Math.floor((simdi - new Date(enErken).getTime()) / 60000);
            const borderRenk = dk >= 10 ? "#ef4444" : dk >= 5 ? "#eab308" : "var(--ast-card-border)";
            return (
              <div key={grup.masaNo} className={`rounded-2xl overflow-hidden${dk >= 10 ? " animate-pulse" : ""}`}
                style={{ background: "var(--ast-card-bg)", border: `1px solid ${borderRenk}`, boxShadow: "var(--ast-card-shadow)" }}>
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base" style={{ color: "var(--ast-text1)" }}>Masa {grup.masaNo}</span>
                    {grup.siparisler.length > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text3)" }}>
                        {grup.siparisler.length} sipariş
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ color: `var(${d.textVar})`, background: `var(${d.bgVar})`, border: `1px solid var(${d.borderVar})` }}>
                    {d.etiket}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {grup.siparisler.map((s, si) => (
                    <div key={s.id}>
                      {si > 0 && <div style={{ borderTop: "1px dashed var(--ast-divider)", marginBottom: 10 }} />}
                      <div className="space-y-1.5">
                        {s.urunler.map((u, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span style={{ color: "var(--ast-text1)" }}>{u.adet}× {u.isim}</span>
                            <span style={{ color: "var(--ast-text2)" }}>₺{(u.fiyat * u.adet).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                      {s.notlar && (
                        <p className="text-xs mt-1.5" style={{ color: "var(--ast-warn-text)" }}>📝 {s.notlar}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: "1px solid var(--ast-divider)" }}>
                  <span className="font-bold" style={{ color: "var(--ast-text1)" }}>₺{grup.toplam.toFixed(0)}</span>
                  {d.sonraki && (
                    <button onClick={() => grupDurumGuncelle(grup, d.sonraki!)}
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
          <div className="absolute inset-0 bg-black/40" onClick={() => setArsivAcik(false)} />

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

            {/* İndirme Butonları */}
            {!arsivYukleniyor && arsivSiparisler.length > 0 && (
              <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--ast-text3)" }}>Arşivi İndir</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => csvIndir(arsivSiparisler, tz)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
                    style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", color: "var(--ast-text1)" }}
                  >
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    CSV
                  </button>
                  <button
                    onClick={() => pdfIndir(arsivSiparisler, tz)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
                    style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", color: "var(--ast-text1)" }}
                  >
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <path d="M9 13h1a1 1 0 010 2H9v-2zm0 0v4m6-4h-1.5a.5.5 0 000 1H15a1 1 0 010 2h-1.5"/>
                    </svg>
                    PDF
                  </button>
                  <button
                    onClick={() => pngIndir(arsivSiparisler, tz)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
                    style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", color: "var(--ast-text1)" }}
                  >
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    PNG
                  </button>
                </div>
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
                          <span className="text-[10px]" style={{ color: "var(--ast-text3)" }}>{saatFormat(s.createdAt, tz)}</span>
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
