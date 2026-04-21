import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

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

export default async function KayitPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;

  async function kayitOl(formData: FormData) {
    "use server";
    const restoranIsim = formData.get("restoranIsim") as string;
    const email = formData.get("email") as string;
    const sifre = formData.get("sifre") as string;

    if (!restoranIsim || !email || !sifre) {
      redirect("/auth/kayit?hata=" + encodeURIComponent("Tüm alanları doldurun."));
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: sifre });

    if (authError || !authData.user) {
      redirect("/auth/kayit?hata=" + encodeURIComponent(authError?.message ?? "Kayıt başarısız."));
    }

    const slug = slugOlustur(restoranIsim);
    const { data: mevcut } = await db.from("Restoran").select("id").eq("slug", slug).single();
    const finalSlug = mevcut ? slugOlustur(restoranIsim) : slug;

    await supabase.from("Restoran").insert({
      userId: authData.user!.id,
      isim: restoranIsim,
      slug: finalSlug,
      renk: "#C89434",
      aktif: true,
    });

    redirect("/dashboard");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1C1510 0%, #261C0F 55%, #2E2214 100%)" }}
    >
      {/* Dekoratif yıldız noktaları */}
      <div className="absolute inset-0 pointer-events-none" style={{ overflow: "hidden" }}>
        {[
          { top: "6%", left: "20%", size: 2, opacity: 0.5 },
          { top: "18%", left: "82%", size: 1.5, opacity: 0.4 },
          { top: "30%", left: "8%", size: 2, opacity: 0.3 },
          { top: "45%", left: "92%", size: 1.5, opacity: 0.5 },
          { top: "65%", left: "15%", size: 2, opacity: 0.4 },
          { top: "75%", left: "70%", size: 1.5, opacity: 0.3 },
          { top: "88%", left: "40%", size: 2, opacity: 0.5 },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size, background: "#C89434", opacity: s.opacity }}
          />
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
            Yeni İşletme Kaydı
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
          <form action={kayitOl} className="space-y-4">
            {[
              { id: "restoranIsim", label: "Restoran / İşletme Adı", type: "text", placeholder: "Lezzet Durağı", autoComplete: "organization" },
              { id: "email", label: "E-posta", type: "email", placeholder: "isletme@mail.com", autoComplete: "email" },
              { id: "sifre", label: "Şifre", type: "password", placeholder: "En az 6 karakter", autoComplete: "new-password" },
            ].map((f) => (
              <div key={f.id}>
                <label htmlFor={f.id} className="text-xs mb-2 block tracking-wider uppercase" style={{ color: "rgba(245,230,200,0.45)" }}>
                  {f.label}
                </label>
                <input
                  id={f.id} name={f.id} type={f.type} required autoComplete={f.autoComplete}
                  minLength={f.id === "sifre" ? 6 : undefined}
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(200,148,52,0.2)",
                    color: "#F5E6C8",
                  }}
                  placeholder={f.placeholder}
                />
              </div>
            ))}

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
              Hesap Oluştur
            </button>
          </form>
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
