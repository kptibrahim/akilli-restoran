"use client";

import { useState, useEffect } from "react";
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
  tr: { yemekler: "Menüyü Görüntüle", wifi: "Wi-Fi Şifresi" },
  en: { yemekler: "View Menu", wifi: "Wi-Fi Password" },
  ru: { yemekler: "Смотреть меню", wifi: "Пароль Wi-Fi" },
  de: { yemekler: "Menü ansehen", wifi: "WLAN-Passwort" },
  fr: { yemekler: "Voir le menu", wifi: "Mot de passe Wi-Fi" },
  es: { yemekler: "Ver menú", wifi: "Contraseña Wi-Fi" },
  it: { yemekler: "Vedi menu", wifi: "Password Wi-Fi" },
  ar: { yemekler: "عرض القائمة", wifi: "كلمة مرور Wi-Fi" },
  zh: { yemekler: "查看菜单", wifi: "Wi-Fi密码" },
  ja: { yemekler: "メニューを見る", wifi: "Wi-Fiパスワード" },
  pt: { yemekler: "Ver menu", wifi: "Senha Wi-Fi" },
  ko: { yemekler: "메뉴 보기", wifi: "와이파이 비밀번호" },
  nl: { yemekler: "Menu bekijken", wifi: "Wi-Fi wachtwoord" },
  pl: { yemekler: "Zobacz menu", wifi: "Hasło Wi-Fi" },
  uk: { yemekler: "Переглянути меню", wifi: "Пароль Wi-Fi" },
};

function getUI(dil: string) {
  return UI[dil] ?? UI.en;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function safergb(color: string) {
  try {
    if (color.startsWith("#") && color.length === 7) return hexToRgb(color);
    return "200,148,52";
  } catch {
    return "200,148,52";
  }
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
  const [mounted, setMounted] = useState(false);

  const [dil, setDil] = useState(() => {
    return aktifDiller[0] ?? "tr";
  });

  useEffect(() => {
    setMounted(true);
    const kayitli = localStorage.getItem("gastronom_dil");
    if (kayitli && aktifDiller.includes(kayitli)) setDil(kayitli);
  }, []);

  function dilSec(yeniDil: string) {
    setDil(yeniDil);
    localStorage.setItem("gastronom_dil", yeniDil);
    localStorage.removeItem("gastronom_dil_isim");
  }

  const aciklamaCeviri =
    dil !== "tr" && restoran.translations?.[dil]?.aciklama
      ? restoran.translations[dil].aciklama
      : restoran.aciklama;

  const ui = getUI(dil);
  const rgb = safergb(restoran.renk);

  function menuUrl() {
    const params = new URLSearchParams();
    params.set("dil", dil);
    if (masa) params.set("masa", masa);
    return `/${restoran.slug}/menu?${params.toString()}`;
  }

  const CSS = `
    @keyframes hos-fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes hos-orb-float {
      0%,100% { transform: translate(0,0) scale(1); }
      50%      { transform: translate(20px,-20px) scale(1.05); }
    }
    @keyframes hos-star-twinkle {
      0%,100% { opacity: var(--min,0.1); transform: scale(1); }
      50%      { opacity: var(--max,0.7); transform: scale(1.3); }
    }
    @keyframes hos-logo-glow {
      0%,100% { box-shadow: 0 0 20px rgba(${rgb},0.35); }
      50%      { box-shadow: 0 0 40px rgba(${rgb},0.65); }
    }
    .hos-fade-up-1 { animation: hos-fade-up 0.6s 0.1s ease both; }
    .hos-fade-up-2 { animation: hos-fade-up 0.6s 0.25s ease both; }
    .hos-fade-up-3 { animation: hos-fade-up 0.6s 0.4s ease both; }
    .hos-fade-up-4 { animation: hos-fade-up 0.6s 0.55s ease both; }
    .hos-fade-up-5 { animation: hos-fade-up 0.6s 0.7s ease both; }
    .hos-logo-glow  { animation: hos-logo-glow 3s ease-in-out infinite; }
  `;

  const stars = mounted ? Array.from({ length: 30 }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 1,
    min: (Math.random() * 0.1 + 0.05).toFixed(2),
    max: (Math.random() * 0.5 + 0.2).toFixed(2),
    duration: `${Math.random() * 3 + 2}s`,
    delay: `${Math.random() * 4}s`,
  })) : [];

  return (
    <main
      className="relative flex flex-col min-h-screen overflow-hidden no-select"
      style={{
        background: restoran.logo
          ? undefined
          : `linear-gradient(160deg, #0d0a06 0%, rgba(${rgb},0.12) 50%, #090705 100%)`,
      }}
    >
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Logo arka plan */}
      {restoran.logo && (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${restoran.logo})` }} />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} />
        </>
      )}

      {/* Orb ışık */}
      {!restoran.logo && (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              top: "-10%", left: "50%", transform: "translateX(-50%)",
              width: "500px", height: "500px",
              background: `radial-gradient(circle, rgba(${rgb},0.18) 0%, transparent 70%)`,
              animation: "hos-orb-float 8s ease-in-out infinite",
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: "-5%", right: "-10%",
              width: "350px", height: "350px",
              background: `radial-gradient(circle, rgba(${rgb},0.1) 0%, transparent 70%)`,
              animation: "hos-orb-float 11s ease-in-out infinite reverse",
            }}
          />
        </>
      )}

      {/* Yıldızlar */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full"
            style={{
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              background: `rgba(${rgb},0.9)`,
              animation: `hos-star-twinkle ${s.duration} ${s.delay} infinite`,
              ["--min" as string]: s.min,
              ["--max" as string]: s.max,
            }}
          />
        ))}
      </div>

      {/* İçerik */}
      <div
        className="relative z-10 flex flex-col flex-1 px-5"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 24px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
        }}
      >
        {/* Dil seçici */}
        {aktifDiller.length > 1 && (
          <div className="hos-fade-up-1 flex justify-center gap-2 pt-2 flex-wrap">
            {aktifDiller.map((kod) => {
              const info = DIL_BAYRAK[kod];
              if (!info) return null;
              return (
                <button
                  key={kod}
                  onClick={() => dilSec(kod)}
                  className="h-9 px-3 rounded-full text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5"
                  style={
                    dil === kod
                      ? {
                          background: `rgba(${rgb},0.25)`,
                          border: `1.5px solid rgba(${rgb},0.6)`,
                          color: "#fff",
                        }
                      : {
                          background: "rgba(255,255,255,0.06)",
                          border: "1.5px solid rgba(255,255,255,0.15)",
                          color: "rgba(255,255,255,0.5)",
                        }
                  }
                >
                  <span>{info.bayrak}</span>
                  <span>{info.kisaltma}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Ortadaki ana alan */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">

          {/* Logo / İlk harf */}
          <div className="hos-fade-up-1">
            {restoran.logo ? (
              <img
                src={restoran.logo}
                alt={restoran.isim}
                className="w-24 h-24 rounded-3xl border-2 object-cover hos-logo-glow"
                style={{ borderColor: `rgba(${rgb},0.5)` }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-3xl border-2 flex items-center justify-center text-4xl font-black hos-logo-glow"
                style={{
                  background: `linear-gradient(135deg, rgba(${rgb},0.3) 0%, rgba(${rgb},0.1) 100%)`,
                  borderColor: `rgba(${rgb},0.5)`,
                  color: "#fff",
                  fontFamily: "inherit",
                  backdropFilter: "blur(12px)",
                }}
              >
                {restoran.isim[0]}
              </div>
            )}
          </div>

          {/* Restoran adı */}
          <div className="hos-fade-up-2 text-center">
            <h1
              className="text-4xl font-black text-white tracking-tight drop-shadow-xl leading-none"
              style={{ fontFamily: "Georgia, serif", textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
            >
              {restoran.isim}
            </h1>
            {aciklamaCeviri && (
              <p
                className="mt-2 text-xs tracking-[0.2em] uppercase"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {aciklamaCeviri}
              </p>
            )}
          </div>

          {/* Masa etiketi */}
          {masa && (
            <div className="hos-fade-up-3">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md"
                style={{
                  background: `rgba(${rgb},0.15)`,
                  border: `1px solid rgba(${rgb},0.35)`,
                }}
              >
                <span className="text-sm" style={{ color: `rgba(${rgb}rgb, 1)` }}>📍</span>
                <span className="text-white text-xs font-bold tracking-widest uppercase">{masa}</span>
              </div>
            </div>
          )}

          {/* Butonlar */}
          <div className="hos-fade-up-4 flex flex-col gap-3 w-full mt-2">
            {/* Menü butonu — gradient, premium */}
            <a
              href={menuUrl()}
              className="w-full h-14 flex items-center justify-center font-bold text-sm tracking-[0.15em] uppercase rounded-2xl transition-all active:scale-95"
              style={{
                background: `linear-gradient(135deg, rgba(${rgb},0.9) 0%, rgba(${rgb},0.7) 100%)`,
                boxShadow: `0 8px 30px rgba(${rgb},0.35)`,
                color: "#fff",
                backdropFilter: "blur(8px)",
                fontFamily: "inherit",
              }}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, marginRight: 8 }}>
                <path d="M3 5h14M3 10h14M3 15h8" strokeLinecap="round" />
              </svg>
              {ui.yemekler}
            </a>

            {/* WiFi butonu — ghost */}
            {(restoran.wifiAdi || restoran.wifiSifre) && (
              <button
                onClick={() => setWifiAcik(true)}
                className="w-full h-14 flex items-center justify-center font-semibold text-sm tracking-[0.15em] uppercase rounded-2xl transition-all active:scale-95"
                style={{
                  touchAction: "manipulation",
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(12px)",
                  fontFamily: "inherit",
                }}
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 16, height: 16, marginRight: 8 }}>
                  <path d="M2.5 9.5C5.5 6.5 9 5 10 5s4.5 1.5 7.5 4.5M5 12c1.4-1.4 3-2.2 5-2.2s3.6.8 5 2.2M7.5 14.5c.7-.7 1.5-1 2.5-1s1.8.3 2.5 1M10 17.5v.1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {ui.wifi}
              </button>
            )}
          </div>
        </div>

        {/* Sosyal medya */}
        {Object.keys(sosyal).length > 0 && (
          <div className="hos-fade-up-5 flex justify-center gap-3 mb-4 flex-wrap">
            {sosyal.instagram && (
              <a href={sosyal.instagram} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white opacity-70"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            )}
            {sosyal.facebook && (
              <a href={sosyal.facebook} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white opacity-70"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            )}
            {sosyal.whatsapp && (
              <a href={`https://wa.me/${sosyal.whatsapp}`} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white opacity-70"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            )}
            {sosyal.website && (
              <a href={sosyal.website} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white opacity-70"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              </a>
            )}
            {sosyal.adres && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(sosyal.adres)}`} target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white opacity-70"><path d="M12 0C7.802 0 4 3.403 4 7.602 4 11.8 7.469 16.812 12 24c4.531-7.188 8-12.2 8-16.398C20 3.403 16.199 0 12 0zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>
              </a>
            )}
          </div>
        )}

        <p className="hos-fade-up-5 text-center text-[10px] tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
          Gastronom AI
        </p>
      </div>

      {/* WiFi Modal */}
      {wifiAcik && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setWifiAcik(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[430px] rounded-t-3xl px-6 pt-5"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom), 40px)",
              background: "#131010",
              border: `1px solid rgba(${rgb},0.2)`,
              borderBottom: "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-6">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: `rgba(${rgb},0.12)`, border: `1px solid rgba(${rgb},0.25)` }}
              >
                📶
              </div>
              <div>
                <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Hoş geldiniz!</p>
                <p className="font-bold text-white text-base" style={{ fontFamily: "inherit" }}>Wi-Fi Bilgileri</p>
              </div>
              {restoran.wifiAdi && (
                <div className="w-full rounded-2xl px-5 py-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <p className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Ağ Adı</p>
                  <p className="font-semibold text-white text-base">{restoran.wifiAdi}</p>
                </div>
              )}
              {restoran.wifiSifre && (
                <div className="w-full rounded-2xl px-5 py-4" style={{ background: `rgba(${rgb},0.1)`, border: `2px solid rgba(${rgb},0.3)` }}>
                  <p className="text-xs mb-1" style={{ color: `rgba(${rgb},0.7)` }}>Şifre</p>
                  <p className="font-black text-2xl tracking-widest" style={{ color: restoran.renk, fontFamily: "inherit" }}>
                    {restoran.wifiSifre}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setWifiAcik(false)}
              className="w-full mt-5 h-12 rounded-2xl font-semibold text-sm transition-all active:scale-95"
              style={{ touchAction: "manipulation", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
