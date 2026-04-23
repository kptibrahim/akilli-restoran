import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ClearPinSession from "./ClearPinSession";

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;

  async function girisYap(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const sifre = formData.get("sifre") as string;

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: sifre });

    if (error) {
      redirect("/auth/giris?hata=" + encodeURIComponent("E-posta veya şifre hatalı."));
    }

    redirect("/dashboard");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1C1510 0%, #261C0F 55%, #2E2214 100%)" }}
    >
      <ClearPinSession />
      {/* Dekoratif yıldız noktaları */}
      <div className="absolute inset-0 pointer-events-none" style={{ overflow: "hidden" }}>
        {[
          { top: "8%", left: "12%", size: 2, opacity: 0.6 },
          { top: "15%", left: "78%", size: 1.5, opacity: 0.4 },
          { top: "25%", left: "55%", size: 2.5, opacity: 0.3 },
          { top: "40%", left: "5%", size: 1.5, opacity: 0.5 },
          { top: "60%", left: "90%", size: 2, opacity: 0.4 },
          { top: "70%", left: "30%", size: 1.5, opacity: 0.3 },
          { top: "82%", left: "65%", size: 2, opacity: 0.5 },
          { top: "90%", left: "18%", size: 1.5, opacity: 0.4 },
          { top: "35%", left: "88%", size: 1, opacity: 0.6 },
          { top: "55%", left: "48%", size: 1, opacity: 0.3 },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              background: "#C89434",
              opacity: s.opacity,
            }}
          />
        ))}
        {/* Sıcak ışık efekti */}
        <div className="absolute" style={{
          top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(200,148,52,0.06) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
      </div>

      {/* Logo */}
      <div className="text-center mb-10 relative z-10">
        <div className="inline-flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative"
            style={{
              background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C89434 100%)",
              boxShadow: "0 0 40px rgba(200,148,52,0.35)",
            }}
          >
            <span className="text-2xl font-black" style={{ color: "#0A0705" }}>A</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ background: "#E8923A", boxShadow: "0 0 8px rgba(232,146,58,0.8)" }} />
          </div>
          <h1 className="text-3xl font-black tracking-[0.2em]" style={{ color: "#F5E6C8" }}>
            GASTRONOM<span style={{ color: "#C89434" }}> AI</span>
          </h1>
          <p className="text-xs mt-1.5 tracking-[0.3em] uppercase" style={{ color: "rgba(245,230,200,0.4)" }}>
            Restoran Yönetim Paneli
          </p>
        </div>
      </div>

      {/* Kart */}
      <div className="w-full max-w-sm relative z-10">
        <div
          className="rounded-2xl p-7 space-y-5"
          style={{
            background: "rgba(255,255,255,0.035)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(200,148,52,0.2)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(200,148,52,0.1)",
          }}
        >
          <div className="text-center mb-1">
            <h2 className="font-semibold text-sm tracking-widest uppercase" style={{ color: "rgba(245,230,200,0.6)" }}>
              Hoş Geldiniz
            </h2>
          </div>

          <form action={girisYap} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-xs mb-2 block tracking-wider uppercase" style={{ color: "rgba(245,230,200,0.45)" }}>
                E-posta
              </label>
              <input
                id="email" name="email" type="email" required autoComplete="email"
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(200,148,52,0.2)",
                  color: "#F5E6C8",
                }}
                placeholder="isletme@mail.com"
              />
            </div>
            <div>
              <label htmlFor="sifre" className="text-xs mb-2 block tracking-wider uppercase" style={{ color: "rgba(245,230,200,0.45)" }}>
                Şifre
              </label>
              <input
                id="sifre" name="sifre" type="password" required autoComplete="current-password"
                className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(200,148,52,0.2)",
                  color: "#F5E6C8",
                }}
                placeholder="••••••••"
              />
            </div>

            {hata && (
              <div className="p-3 rounded-xl" style={{ background: "rgba(139,26,42,0.2)", border: "1px solid rgba(139,26,42,0.4)" }}>
                <p className="text-xs" style={{ color: "#F87B8A" }}>{decodeURIComponent(hata)}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C8832A 100%)",
                color: "#0A0705",
                boxShadow: "0 4px 20px rgba(200,148,52,0.35)",
              }}
            >
              Giriş Yap
            </button>
          </form>
        </div>

        <div className="flex flex-col items-center gap-2 mt-5">
          <p className="text-center text-sm" style={{ color: "rgba(245,230,200,0.35)" }}>
            Hesabınız yok mu?{" "}
            <a href="/auth/kayit" className="font-semibold" style={{ color: "#C89434" }}>
              Kayıt olun
            </a>
          </p>
          <a href="/auth/sifre-sifirla" className="text-xs font-medium" style={{ color: "rgba(245,230,200,0.4)" }}>
            Şifremi Unuttum
          </a>
        </div>
      </div>

      <p className="text-xs mt-10 tracking-[0.3em] relative z-10" style={{ color: "rgba(245,230,200,0.15)" }}>
        GASTRONOM AI © 2025
      </p>
    </div>
  );
}
