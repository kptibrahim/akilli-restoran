"use client";

import { useState, useEffect, use } from "react";

const STARS = [
  { top: "8%", left: "12%", size: 2, opacity: 0.6 },
  { top: "15%", left: "78%", size: 1.5, opacity: 0.4 },
  { top: "40%", left: "5%", size: 1.5, opacity: 0.5 },
  { top: "60%", left: "90%", size: 2, opacity: 0.4 },
  { top: "82%", left: "65%", size: 2, opacity: 0.5 },
  { top: "35%", left: "88%", size: 1, opacity: 0.6 },
];

export default function SifreYenilePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = use(searchParams);
  const [yeniSifre, setYeniSifre] = useState("");
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [basarili, setBasarili] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    if (!token) setHata("Geçersiz bağlantı. Lütfen tekrar talep edin.");
  }, [token]);

  async function sifreDegistir() {
    if (!token) return;
    if (yeniSifre.length < 8) { setHata("Şifre en az 8 karakter olmalı."); return; }
    if (yeniSifre !== yeniSifreTekrar) { setHata("Şifreler eşleşmiyor."); return; }
    setHata("");
    setYukleniyor(true);
    try {
      const res = await fetch("/api/restoran/sifre-onayla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, yeniSifre }),
      });
      const json = await res.json();
      if (!res.ok) { setHata(json.error ?? "Bir hata oluştu."); return; }
      setBasarili(true);
      setTimeout(() => { window.location.href = "/auth/giris"; }, 2500);
    } catch {
      setHata("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1C1510 0%, #261C0F 55%, #2E2214 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, background: "#C89434", opacity: s.opacity }} />
        ))}
        <div className="absolute" style={{
          top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(200,148,52,0.06) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
      </div>

      <div className="text-center mb-10 relative z-10">
        <div className="inline-flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C89434 100%)", boxShadow: "0 0 40px rgba(200,148,52,0.35)" }}>
            <span className="text-2xl font-black" style={{ color: "#0A0705" }}>A</span>
          </div>
          <h1 className="text-3xl font-black tracking-[0.2em]" style={{ color: "#F5E6C8" }}>
            GASTRONOM<span style={{ color: "#C89434" }}> AI</span>
          </h1>
          <p className="text-xs mt-1.5 tracking-[0.3em] uppercase" style={{ color: "rgba(245,230,200,0.4)" }}>
            Yeni Şifre Belirle
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="rounded-2xl p-7 space-y-5"
          style={{
            background: "rgba(255,255,255,0.035)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(200,148,52,0.2)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,148,52,0.1)",
          }}>

          {basarili ? (
            <div className="text-center py-4 space-y-4">
              <div className="text-4xl">✅</div>
              <p className="font-bold" style={{ color: "#F5E6C8" }}>Şifreniz değiştirildi!</p>
              <p className="text-sm" style={{ color: "rgba(245,230,200,0.6)" }}>
                Birkaç saniye içinde giriş sayfasına yönlendiriliyorsunuz...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-1">
                <h2 className="font-semibold text-sm tracking-widest uppercase" style={{ color: "rgba(245,230,200,0.6)" }}>
                  Yeni Şifre Belirle
                </h2>
              </div>

              <div>
                <label className="text-xs mb-2 block tracking-wider uppercase" style={{ color: "rgba(245,230,200,0.45)" }}>
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  value={yeniSifre}
                  onChange={(e) => setYeniSifre(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,148,52,0.2)", color: "#F5E6C8" }}
                  placeholder="En az 8 karakter"
                />
              </div>

              <div>
                <label className="text-xs mb-2 block tracking-wider uppercase" style={{ color: "rgba(245,230,200,0.45)" }}>
                  Yeni Şifre (Tekrar)
                </label>
                <input
                  type="password"
                  value={yeniSifreTekrar}
                  onChange={(e) => setYeniSifreTekrar(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sifreDegistir()}
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,148,52,0.2)", color: "#F5E6C8" }}
                  placeholder="••••••••"
                />
              </div>

              {hata && (
                <div className="p-3 rounded-xl" style={{ background: "rgba(139,26,42,0.2)", border: "1px solid rgba(139,26,42,0.4)" }}>
                  <p className="text-xs" style={{ color: "#F87B8A" }}>{hata}</p>
                </div>
              )}

              {!token ? null : (
                <button
                  onClick={sifreDegistir}
                  disabled={yukleniyor}
                  className="w-full py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C8832A 100%)", color: "#0A0705", boxShadow: "0 4px 20px rgba(200,148,52,0.35)" }}>
                  {yukleniyor ? "Kaydediliyor..." : "Şifremi Değiştir"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
