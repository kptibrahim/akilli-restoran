"use client";

import { useState } from "react";
import { DIL_BAYRAK } from "@/lib/translate";

type Translations = Record<string, Record<string, string>>;

type Restoran = {
  id: string;
  slug: string;
  isim: string;
  renk: string;
  logo: string | null;
  aciklama: string | null;
  wifiAdi: string | null;
  wifiSifre: string | null;
  sosyalMedya: Record<string, string> | null;
  selectedLanguages: string[] | null;
  translations: Translations | null;
};

const UI: Record<string, { yemekler: string; wifi: string }> = {
  tr: { yemekler: "MENÜ", wifi: "Wİ-Fİ" },
  en: { yemekler: "MENU", wifi: "Wi-Fi" },
  ru: { yemekler: "МЕНЮ", wifi: "Wi-Fi" },
  de: { yemekler: "MENÜ", wifi: "WLAN" },
  fr: { yemekler: "MENU", wifi: "Wi-Fi" },
  es: { yemekler: "MENÚ", wifi: "Wi-Fi" },
  it: { yemekler: "MENÙ", wifi: "Wi-Fi" },
  ar: { yemekler: "القائمة", wifi: "واي فاي" },
  zh: { yemekler: "菜单", wifi: "无线网络" },
  ja: { yemekler: "メニュー", wifi: "Wi-Fi" },
  pt: { yemekler: "MENU", wifi: "Wi-Fi" },
  ko: { yemekler: "메뉴", wifi: "와이파이" },
  nl: { yemekler: "MENU", wifi: "Wi-Fi" },
  pl: { yemekler: "MENU", wifi: "Wi-Fi" },
  uk: { yemekler: "МЕНЮ", wifi: "Wi-Fi" },
};

function getUI(dil: string) {
  return UI[dil] ?? UI.en;
}

export default function HosGeldinClient({
  restoran,
  masa,
}: {
  restoran: Restoran;
  masa?: string;
}) {
  const sosyal = restoran.sosyalMedya ?? {};
  const aktifDiller: string[] = restoran.selectedLanguages?.length
    ? restoran.selectedLanguages
    : ["tr"];

  const [wifiAcik, setWifiAcik] = useState(false);

  const [dil, setDil] = useState(() => {
    // localStorage'dan kayıtlı dili oku (client-only, ilk render TR)
    if (typeof window !== "undefined") {
      const kayitli = localStorage.getItem("gastronom_dil");
      if (kayitli && aktifDiller.includes(kayitli)) return kayitli;
    }
    return aktifDiller[0] ?? "tr";
  });

  function dilSec(yeniDil: string) {
    setDil(yeniDil);
    localStorage.setItem("gastronom_dil", yeniDil);
    localStorage.removeItem("gastronom_dil_isim");
  }

  // Slogan: DB'den çeviri, yoksa TR
  const aciklamaCeviri =
    dil !== "tr" && restoran.translations?.[dil]?.aciklama
      ? restoran.translations[dil].aciklama
      : restoran.aciklama;

  const ui = getUI(dil);

  function menuUrl() {
    const params = new URLSearchParams();
    params.set("dil", dil);
    if (masa) params.set("masa", masa);
    return `/${restoran.slug}/menu?${params.toString()}`;
  }

  return (
    <main className="relative flex flex-col min-h-screen overflow-hidden no-select">
      {/* Arka Plan */}
      {restoran.logo ? (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${restoran.logo})` }} />
      ) : (
        <div className="absolute inset-0" style={{
          background: `linear-gradient(160deg, ${restoran.renk} 0%, ${restoran.renk}99 40%, #111 100%)`,
        }} />
      )}
      <div className="absolute inset-0 bg-black/55" />

      {/* İçerik */}
      <div
        className="relative z-10 flex flex-col flex-1 px-5"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 20px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 20px)",
        }}
      >
        {/* Dil Seçici — sadece aktif diller */}
        {aktifDiller.length > 1 && (
          <div className="flex justify-center gap-2 pt-2 flex-wrap">
            {aktifDiller.map((kod) => {
              const info = DIL_BAYRAK[kod];
              if (!info) return null;
              return (
                <button
                  key={kod}
                  onClick={() => dilSec(kod)}
                  className="h-10 px-3 rounded-full border-2 text-white text-xs font-bold backdrop-blur-sm transition-all flex items-center gap-1.5"
                  style={
                    dil === kod
                      ? { borderColor: "white", backgroundColor: "rgba(255,255,255,0.25)" }
                      : { borderColor: "rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.55)" }
                  }
                >
                  <span>{info.bayrak}</span>
                  <span>{info.kisaltma}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Logo & Marka + Navigasyon Butonları */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6">
          {restoran.logo ? (
            <img
              src={restoran.logo}
              alt={restoran.isim}
              className="w-20 h-20 rounded-full border-2 border-white/30 object-cover backdrop-blur-sm"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full border-2 border-white/30 flex items-center justify-center text-white text-3xl font-bold backdrop-blur-sm"
              style={{ backgroundColor: restoran.renk + "66" }}
            >
              {restoran.isim[0]}
            </div>
          )}
          <h1 className="text-4xl font-bold text-white text-center tracking-wide drop-shadow-xl" style={{ fontFamily: "Georgia, serif" }}>
            {restoran.isim}
          </h1>
          {masa && (
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5">
              <span className="text-white/80 text-xs">📍</span>
              <span className="text-white text-xs font-semibold tracking-wide">{masa}</span>
            </div>
          )}
          {aciklamaCeviri && (
            <p className="text-white/60 text-xs tracking-[0.2em] uppercase text-center">{aciklamaCeviri}</p>
          )}

          {/* Navigasyon Butonları */}
          <div className="flex flex-col gap-3 w-full mt-4">
            <a
              href={menuUrl()}
              className="w-full h-14 flex items-center justify-center text-white font-semibold text-sm tracking-[0.2em] uppercase border border-white/40 backdrop-blur-md"
              style={{ backgroundColor: restoran.renk + "cc" }}
            >
              {ui.yemekler}
            </a>
            {(restoran.wifiAdi || restoran.wifiSifre) && (
              <button
                onClick={() => setWifiAcik(true)}
                style={{ touchAction: "manipulation" }}
                className="w-full h-14 flex items-center justify-center text-white font-semibold text-sm tracking-[0.2em] uppercase border border-white/30 bg-black/40 backdrop-blur-md"
              >
                📶 {ui.wifi}
              </button>
            )}
          </div>
        </div>

        {/* Sosyal Medya */}
        <div className="flex justify-center gap-4 mb-4 flex-wrap">
          {sosyal.instagram && (
            <a href={sosyal.instagram} target="_blank" rel="noopener noreferrer"
              className="w-11 h-11 rounded-full bg-white/10 border border-white/30 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
          )}
          {sosyal.facebook && (
            <a href={sosyal.facebook} target="_blank" rel="noopener noreferrer"
              className="w-11 h-11 rounded-full bg-white/10 border border-white/30 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          )}
          {sosyal.whatsapp && (
            <a href={`https://wa.me/${sosyal.whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="w-11 h-11 rounded-full bg-white/10 border border-white/30 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          )}
          {sosyal.website && (
            <a href={sosyal.website} target="_blank" rel="noopener noreferrer"
              className="w-11 h-11 rounded-full bg-white/10 border border-white/30 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            </a>
          )}
          {sosyal.adres && (
            <a href={`https://maps.google.com/?q=${encodeURIComponent(sosyal.adres)}`} target="_blank" rel="noopener noreferrer"
              className="w-11 h-11 rounded-full bg-white/10 border border-white/30 backdrop-blur-sm hover:bg-white/20 transition-colors flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 0C7.802 0 4 3.403 4 7.602 4 11.8 7.469 16.812 12 24c4.531-7.188 8-12.2 8-16.398C20 3.403 16.199 0 12 0zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>
            </a>
          )}
        </div>

        <p className="text-center text-white/25 text-[10px] tracking-widest">
          GASTRONOM AI
        </p>
      </div>

      {/* WiFi Modal */}
      {wifiAcik && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setWifiAcik(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl px-6 pt-5 pb-10"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 40px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: restoran.renk + "15" }}>
                📶
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Hoş geldiniz!</p>
                <p className="font-bold text-gray-800 text-base">Wi-Fi şifremiz:</p>
              </div>
              {restoran.wifiAdi && (
                <div className="w-full bg-gray-50 rounded-2xl px-5 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">Ağ Adı</p>
                  <p className="font-semibold text-gray-800 text-base">{restoran.wifiAdi}</p>
                </div>
              )}
              {restoran.wifiSifre && (
                <div className="w-full rounded-2xl px-5 py-4" style={{ backgroundColor: restoran.renk + "12", border: `2px solid ${restoran.renk}30` }}>
                  <p className="text-xs mb-1" style={{ color: restoran.renk + "99" }}>Şifre</p>
                  <p className="font-black text-2xl tracking-widest" style={{ color: restoran.renk }}>
                    {restoran.wifiSifre}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setWifiAcik(false)}
              style={{ touchAction: "manipulation" }}
              className="w-full mt-5 h-12 rounded-2xl bg-gray-100 text-gray-500 text-sm font-semibold"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
