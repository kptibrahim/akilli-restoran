"use client";

import { useEffect, useState, useCallback } from "react";

type DonemKey = "gunluk" | "haftalik" | "aylik";
type Urun = { isim: string; adet: number; fiyat: number };
type Siparis = {
  id: string; masaNo: string; urunler: Urun[];
  toplam: number; durum: string; notlar: string | null; createdAt: string;
};
type ChatLog = { id: string; soru: string; cevap: string; createdAt: string };
type ArsivGrup = { key: string; label: string; siparisler: Siparis[]; ciro: number; count: number };

const DONEM_ETIKET: Record<DonemKey, string> = { gunluk: "Günlük", haftalik: "Haftalık", aylik: "Aylık" };

function isoFix(s: string) {
  return s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s) ? s : s + "Z";
}

function getDonemBas(donem: DonemKey): string {
  const now = new Date();
  if (donem === "gunluk") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (donem === "haftalik") {
    const day = now.getDay();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1)).toISOString();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function getDonemLabel(donem: DonemKey): string {
  const now = new Date();
  if (donem === "gunluk") return now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  if (donem === "haftalik") {
    const day = now.getDay();
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return `${mon.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – ${sun.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return now.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

function weekNum(d: Date): number {
  const date = new Date(d); date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const w1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - w1.getTime()) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
}

function grupla(siparisler: Siparis[], donem: DonemKey): ArsivGrup[] {
  const map: Record<string, ArsivGrup> = {};
  for (const s of siparisler) {
    const d = new Date(isoFix(s.createdAt));
    let key: string, label: string;
    if (donem === "gunluk") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      label = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    } else if (donem === "haftalik") {
      const day = d.getDay();
      const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day === 0 ? 6 : day - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      key = `${d.getFullYear()}-W${String(weekNum(d)).padStart(2, "0")}`;
      label = `${mon.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – ${sun.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      label = d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    }
    if (!map[key]) map[key] = { key, label, siparisler: [], ciro: 0, count: 0 };
    map[key].siparisler.push(s);
    map[key].ciro += s.toplam;
    map[key].count++;
  }
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

function csvIndir(label: string, siparisler: Siparis[]) {
  const rows = [
    ["Tarih/Saat", "Masa", "Urunler", "Toplam(TL)"],
    ...siparisler.map(s => {
      const d = new Date(isoFix(s.createdAt));
      return [
        d.toLocaleString("tr-TR"),
        s.masaNo,
        s.urunler.map(u => `${u.adet}x ${u.isim}`).join(" | "),
        s.toplam.toFixed(2),
      ];
    }),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
  a.download = `rapor-${label.replace(/[\s/–]/g, "-")}.csv`;
  a.click();
}

const cardStyle = {
  background: "var(--ast-card-bg)",
  border: "1px solid var(--ast-card-border)",
  boxShadow: "var(--ast-card-shadow)",
};

const tabAktif = { background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" };
const tabPasif = { color: "var(--ast-text2)", background: "transparent" };

export default function AnalitikClient({ restoranId }: { restoranId: string }) {
  const [donem, setDonem] = useState<DonemKey>("gunluk");
  const [siparisler, setSiparisler] = useState<Siparis[]>([]);
  const [chatLoglar, setChatLoglar] = useState<ChatLog[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const [arsivAcik, setArsivAcik] = useState(false);
  const [arsivDonem, setArsivDonem] = useState<DonemKey>("gunluk");
  const [arsivSiparisler, setArsivSiparisler] = useState<Siparis[]>([]);
  const [arsivYukleniyor, setArsivYukleniyor] = useState(false);
  const [temizleOnay, setTemizleOnay] = useState(false);
  const [temizleniyor, setTemizleniyor] = useState(false);

  useEffect(() => {
    setYukleniyor(true);
    const bas = encodeURIComponent(getDonemBas(donem));
    fetch(`/api/analitik?restoranId=${restoranId}&bas=${bas}`)
      .then(r => r.json())
      .then(data => {
        setSiparisler(data.siparisler ?? []);
        setChatLoglar(data.chatLoglar ?? []);
        setYukleniyor(false);
      });
  }, [restoranId, donem]);

  const arsivAc = useCallback(async () => {
    setArsivAcik(true);
    setArsivYukleniyor(true);
    const res = await fetch(`/api/analitik?restoranId=${restoranId}&arsiv=true`);
    const data = await res.json();
    setArsivSiparisler(data.siparisler ?? []);
    setArsivYukleniyor(false);
  }, [restoranId]);

  const arsivTemizle = useCallback(async () => {
    setTemizleniyor(true);
    await fetch(`/api/analitik?restoranId=${restoranId}`, { method: "DELETE" });
    setTemizleOnay(false);
    setTemizleniyor(false);
  }, [restoranId]);

  const ciro = siparisler.reduce((a, s) => a + s.toplam, 0);
  const ortSepet = siparisler.length > 0 ? ciro / siparisler.length : 0;

  const urunSayim: Record<string, { isim: string; adet: number }> = {};
  for (const s of siparisler) {
    for (const u of s.urunler ?? []) {
      if (!u?.isim) continue;
      if (!urunSayim[u.isim]) urunSayim[u.isim] = { isim: u.isim, adet: 0 };
      urunSayim[u.isim].adet += u.adet ?? 1;
    }
  }
  const enCok = Object.values(urunSayim).sort((a, b) => b.adet - a.adet).slice(0, 5);
  const maxAdet = enCok[0]?.adet ?? 1;

  const arsivGruplar: ArsivGrup[] = arsivSiparisler.length > 0 ? grupla(arsivSiparisler, arsivDonem) : [];

  const istatistikler = [
    { label: "Toplam Sipariş", deger: siparisler.length, ikon: "◳" },
    { label: "Toplam Ciro", deger: `₺${ciro.toFixed(0)}`, ikon: "◈" },
    { label: "Ort. Sepet", deger: siparisler.length > 0 ? `₺${ortSepet.toFixed(0)}` : "–", ikon: "◎" },
    { label: "AI Sohbet", deger: chatLoglar.length, ikon: "◉" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-3xl" style={{ paddingBottom: 100 }}>
      {/* Başlık */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--ast-text1)" }}>Analitik Raporlar</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--ast-text2)" }}>{getDonemLabel(donem)}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {!yukleniyor && siparisler.length > 0 && (
            <button
              onClick={() => csvIndir(getDonemLabel(donem), siparisler)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold"
              style={{ border: "1px solid var(--ast-divider)", background: "var(--ast-card-bg)", color: "var(--ast-text2)" }}
            >
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV
            </button>
          )}
          <button
            onClick={arsivAc}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold"
            style={{ border: "1px solid var(--ast-gold)", background: "var(--ast-nav-active-bg)", color: "var(--ast-gold)" }}
          >
            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
            Arşiv
          </button>
        </div>
      </div>

      {/* Dönem Sekmeleri */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl"
        style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)" }}>
        {(["gunluk", "haftalik", "aylik"] as DonemKey[]).map(d => (
          <button key={d} onClick={() => setDonem(d)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={donem === d ? tabAktif : tabPasif}>
            {DONEM_ETIKET[d]}
          </button>
        ))}
      </div>

      {yukleniyor ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--ast-gold)", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <>
          {/* İstatistik Kartları */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {istatistikler.map(ist => (
              <div key={ist.label} className="rounded-2xl p-5" style={cardStyle}>
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
          <div className="rounded-2xl p-5 mb-4" style={cardStyle}>
            <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
              <span style={{ color: "var(--ast-gold)" }}>◈</span> En Çok Sipariş Edilen
            </h2>
            {enCok.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🍽️</p>
                <p className="text-sm" style={{ color: "var(--ast-text2)" }}>Bu dönemde sipariş yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {enCok.map((u, i) => (
                  <div key={u.isim}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold w-4" style={{ color: "var(--ast-text3)" }}>{i + 1}</span>
                        <span className="text-sm font-medium" style={{ color: "var(--ast-text1)" }}>{u.isim}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "var(--ast-gold)" }}>{u.adet} adet</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ast-divider)" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${(u.adet / maxAdet) * 100}%`, background: "linear-gradient(90deg, #C89434, #E8B84B)" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Sohbet Özeti */}
          {chatLoglar.length > 0 && (
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
                <span style={{ color: "var(--ast-gold)" }}>◉</span> Son AI Soruları
              </h2>
              <div className="space-y-3">
                {chatLoglar.slice(0, 5).map(log => (
                  <div key={log.id} className="rounded-xl p-3.5"
                    style={{ border: "1px solid var(--ast-card-border)", background: "var(--ast-icon-bg)" }}>
                    <p className="text-sm font-medium flex gap-2" style={{ color: "var(--ast-text1)" }}>
                      <span style={{ color: "var(--ast-gold)" }}>?</span>
                      <span>{log.soru}</span>
                    </p>
                    <p className="text-xs mt-1.5 line-clamp-2 ml-4" style={{ color: "var(--ast-text2)" }}>{log.cevap}</p>
                    <p className="text-[10px] mt-1.5 ml-4" style={{ color: "var(--ast-text3)" }}>
                      {new Date(isoFix(log.createdAt)).toLocaleString("tr-TR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Arşiv Paneli */}
      {arsivAcik && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setArsivAcik(false); setTemizleOnay(false); }} />
          <div className="relative flex flex-col h-full w-full max-w-md"
            style={{ background: "var(--ast-bg)", borderLeft: "1px solid var(--ast-divider)", animation: "slideInRight 0.3s ease" }}>

            {/* Panel Başlık */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--ast-divider)" }}>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="var(--ast-gold)" strokeWidth={2}>
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                </svg>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--ast-text1)" }}>Rapor Arşivi</p>
                  <p className="text-[10px]" style={{ color: "var(--ast-text3)" }}>Tüm dönemler · CSV olarak indir</p>
                </div>
              </div>
              <button onClick={() => { setArsivAcik(false); setTemizleOnay(false); }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-lg"
                style={{ background: "var(--ast-card-bg)", color: "var(--ast-text2)" }}>×</button>
            </div>

            {/* Arşiv Dönem Sekmeleri */}
            <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--ast-divider)" }}>
              <div className="flex gap-1 p-1 rounded-xl"
                style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)" }}>
                {(["gunluk", "haftalik", "aylik"] as DonemKey[]).map(d => (
                  <button key={d} onClick={() => setArsivDonem(d)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={arsivDonem === d ? tabAktif : tabPasif}>
                    {DONEM_ETIKET[d]}
                  </button>
                ))}
              </div>
            </div>

            {/* Özet satırı */}
            {!arsivYukleniyor && arsivGruplar.length > 0 && (
              <div className="px-5 py-2.5 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--ast-divider)", background: "var(--ast-icon-bg)" }}>
                <span className="text-xs" style={{ color: "var(--ast-text3)" }}>
                  {arsivGruplar.length} {arsivDonem === "gunluk" ? "gün" : arsivDonem === "haftalik" ? "hafta" : "ay"}
                </span>
                <span className="text-xs font-bold" style={{ color: "var(--ast-gold)" }}>
                  Toplam: ₺{arsivGruplar.reduce((a, g) => a + g.ciro, 0).toFixed(0)}
                </span>
              </div>
            )}

            {/* Arşiv Listesi */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {arsivYukleniyor ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--ast-gold)", borderTopColor: "transparent" }} />
                </div>
              ) : arsivGruplar.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">📂</p>
                  <p className="text-sm" style={{ color: "var(--ast-text2)" }}>Arşiv boş</p>
                  <p className="text-xs mt-1" style={{ color: "var(--ast-text3)" }}>Sipariş geldikçe burada görünür</p>
                </div>
              ) : (
                arsivGruplar.map(grup => (
                  <div key={grup.key} className="rounded-xl p-4"
                    style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--ast-text1)" }}>{grup.label}</p>
                        <div className="flex gap-3 mt-0.5">
                          <span className="text-xs" style={{ color: "var(--ast-text3)" }}>{grup.count} sipariş</span>
                          <span className="text-xs font-bold" style={{ color: "var(--ast-gold)" }}>₺{grup.ciro.toFixed(0)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => csvIndir(grup.label, grup.siparisler)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-70"
                        style={{ border: "1px solid var(--ast-divider)", background: "var(--ast-icon-bg)", color: "var(--ast-text2)" }}>
                        <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        CSV
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Temizle Butonu */}
            <div className="px-5 py-4" style={{ borderTop: "1px solid var(--ast-divider)" }}>
              {!temizleOnay ? (
                <button
                  onClick={() => setTemizleOnay(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ border: "1px solid var(--ast-divider)", background: "var(--ast-card-bg)", color: "var(--ast-text3)" }}>
                  AI Sohbet Geçmişini Temizle
                </button>
              ) : (
                <div className="rounded-xl p-4" style={{ background: "var(--ast-warn-bg)", border: "1px solid var(--ast-warn-border)" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--ast-warn-text)" }}>Emin misin?</p>
                  <p className="text-xs mb-3" style={{ color: "var(--ast-text3)" }}>
                    Tüm AI sohbet geçmişi kalıcı olarak silinir. Sipariş ve ciro verileri korunur.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setTemizleOnay(false)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--ast-card-bg)", color: "var(--ast-text2)" }}>
                      İptal
                    </button>
                    <button onClick={arsivTemizle} disabled={temizleniyor}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: "var(--ast-warn-bg)", color: "var(--ast-warn-text)", border: "1px solid var(--ast-warn-border)", opacity: temizleniyor ? 0.6 : 1 }}>
                      {temizleniyor ? "..." : "Temizle"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
