"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

function slugOlustur(isim: string) {
  return isim
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Math.random().toString(36).slice(2, 6);
}

function authHataTurkce(msg?: string): string {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("email address is already")) return "Bu e-posta adresiyle zaten bir hesap oluşturulmuş.";
  if (m.includes("invalid email")) return "Geçersiz e-posta adresi.";
  if (m.includes("password")) return "Şifre en az 6 karakter olmalıdır.";
  if (m.includes("rate limit") || m.includes("too many")) return "Çok fazla deneme yapıldı. Lütfen bekleyin.";
  return "Kayıt başarısız. Lütfen tekrar deneyin.";
}

const STARS = [
  { top: "6%", left: "20%", size: 2, opacity: 0.5 },
  { top: "18%", left: "82%", size: 1.5, opacity: 0.4 },
  { top: "30%", left: "8%", size: 2, opacity: 0.3 },
  { top: "45%", left: "92%", size: 1.5, opacity: 0.5 },
  { top: "65%", left: "15%", size: 2, opacity: 0.4 },
  { top: "75%", left: "70%", size: 1.5, opacity: 0.3 },
  { top: "88%", left: "40%", size: 2, opacity: 0.5 },
];

export default function KayitPage() {
  const [restoranIsim, setRestoranIsim] = useState("");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifreTekrar, setSifreTekrar] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [basarili, setBasarili] = useState(false);

  const sifreEslesmedi = sifreTekrar.length > 0 && sifre !== sifreTekrar;

  async function kayitOl(e: React.FormEvent) {
    e.preventDefault();
    setHata("");

    if (!restoranIsim.trim() || !email.trim() || !sifre || !sifreTekrar) {
      setHata("Tüm alanları doldurun.");
      return;
    }
    if (sifre !== sifreTekrar) {
      setHata("Şifreler eşleşmiyor. Lütfen tekrar kontrol edin.");
      return;
    }
    if (sifre.length < 6) {
      setHata("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setYukleniyor(true);
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: sifre,
      });

      if (authError || !authData.user) {
        setHata(authHataTurkce(authError?.message));
        return;
      }

      const slug = slugOlustur(restoranIsim.trim());
      const res = await fetch("/api/restoran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isim: restoranIsim.trim(), slug }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setHata(json.error ?? "Restoran oluşturulamadı. Tekrar deneyin.");
        return;
      }

      setBasarili(true);
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
      <div className="absolute inset-0 pointer-events-none" style={{ overflow: "hidden" }}>
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

      {/* Logo */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative"
            style={{ background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C89434 100%)", boxShadow: "0 0 40px rgba(200,148,52,0.35)" }}>
            <span className="text-2xl font-black" style={{ color: "#0A0705" }}>A</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ background: "#E8923A", boxShadow: "0 0 8px rgba(232,146,58,0.8)" }} />
          </div>
          <h1 className="text-3xl font-black tracking-[0.2em]" style={{ color: "#F5E6C8" }}>
            GASTRONOM<span style={{ color: "#C89434" }}> AI</span>
          </h1>
          <p className="text-xs mt-1.5 tracking-[0.3em] uppercase" style={{ color: "rgba(245,230,200,0.4)" }}>
            Yeni İşletme Kaydı
          </p>
        </div>
      </div>

      {/* Kart */}
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
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C89434 100%)", boxShadow: "0 0 30px rgba(200,148,52,0.4)" }}>
                <span className="text-3xl">✓</span>
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: "#F5E6C8" }}>
                  Gastronom'a Hoş Geldiniz!
                </p>
                <p className="text-sm mt-2" style={{ color: "rgba(245,230,200,0.6)" }}>
                  Başarılı şekilde kayıt oluşturdunuz.
                </p>
              </div>
              <a
                href="/dashboard"
                className="block w-full py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase text-center transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C8832A 100%)", color: "#0A0705", boxShadow: "0 4px 20px rgba(200,148,52,0.35)" }}>
                Dashboard'a Git
              </a>
            </div>
          ) : (
            <form onSubmit={kayitOl} className="space-y-4">
              {/* Restoran adı */}
              <div>
                <label className="text-xs mb-2 block tracking-wider uppercase" style={{ color: "rgba(245,230,200,0.45)" }}>
                  Restoran / İşletme Adı
                </label>
                <input
                  type="text" required autoComplete="organization"
                  value={restoranIsim} onChange={(e) => setRestoranIsim(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,148,52,0.2)", color: "#F5E6C8" }}
                  placeholder="Lezzet Durağı"
                />
              </div>

              {/* E-posta */}
              <div>
                <label className="text-xs mb-2 block tracking-wider uppercase" style={{ color: "rgba(245,230,200,0.45)" }}>
                  E-posta
                </label>
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,148,52,0.2)", color: "#F5E6C8" }}
                  placeholder="isletme@mail.com"
                />
              </div>

              {/* Şifre */}
              <div>
                <label className="text-xs mb-2 block tracking-wider uppercase" style={{ color: "rgba(245,230,200,0.45)" }}>
                  Şifre
                </label>
                <input
                  type="password" required autoComplete="new-password" minLength={6}
                  value={sifre} onChange={(e) => setSifre(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,148,52,0.2)", color: "#F5E6C8" }}
                  placeholder="En az 6 karakter"
                />
              </div>

              {/* Şifre Tekrar */}
              <div>
                <label className="text-xs mb-2 block tracking-wider uppercase" style={{ color: "rgba(245,230,200,0.45)" }}>
                  Şifre Tekrar
                </label>
                <input
                  type="password" required autoComplete="new-password"
                  value={sifreTekrar} onChange={(e) => setSifreTekrar(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: sifreEslesmedi ? "1px solid rgba(248,123,138,0.6)" : "1px solid rgba(200,148,52,0.2)",
                    color: "#F5E6C8",
                  }}
                  placeholder="Şifrenizi tekrar girin"
                />
                {sifreEslesmedi && (
                  <p className="text-xs mt-1.5" style={{ color: "#F87B8A" }}>Şifreler eşleşmiyor.</p>
                )}
              </div>

              {hata && (
                <div className="p-3 rounded-xl" style={{ background: "rgba(139,26,42,0.2)", border: "1px solid rgba(139,26,42,0.4)" }}>
                  <p className="text-xs" style={{ color: "#F87B8A" }}>{hata}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={yukleniyor}
                className="w-full py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C8832A 100%)", color: "#0A0705", boxShadow: "0 4px 20px rgba(200,148,52,0.35)" }}>
                {yukleniyor ? "Oluşturuluyor..." : "Hesap Oluştur"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "rgba(245,230,200,0.35)" }}>
          Zaten hesabınız var mı?{" "}
          <a href="/auth/giris" className="font-semibold" style={{ color: "#C89434" }}>
            Giriş yapın
          </a>
        </p>
      </div>

      <p className="text-xs mt-10 tracking-[0.3em] relative z-10" style={{ color: "rgba(245,230,200,0.15)" }}>
        GASTRONOM AI © 2025
      </p>
    </div>
  );
}
