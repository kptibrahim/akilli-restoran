"use client";

import { useState } from "react";

export default function RestoranKurClient() {
  const [isim, setIsim] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");

  function slugOlustur(ad: string) {
    return ad
      .toLowerCase()
      .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
      + "-" + Math.random().toString(36).slice(2, 6);
  }

  async function olustur() {
    if (!isim.trim()) { setHata("İşletme adı boş olamaz"); return; }
    setHata(""); setYukleniyor(true);
    const res = await fetch("/api/restoran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isim: isim.trim(), slug: slugOlustur(isim.trim()) }),
    });
    if (res.ok) {
      window.location.href = "/dashboard/ayarlar";
    } else {
      const json = await res.json();
      setHata(json.error ?? "Oluşturulamadı, tekrar deneyin.");
      setYukleniyor(false);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-md">
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="h-5 px-2.5 rounded-full flex items-center"
            style={{ background: "rgba(200,148,52,0.12)", border: "1px solid rgba(200,148,52,0.25)" }}
          >
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--ast-gold)" }}>
              İlk Kurulum
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-black" style={{ color: "var(--ast-text1)" }}>Restoranını Kur</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ast-text2)" }}>
          Paneli kullanmaya başlamak için restoranınızı oluşturun.
        </p>
      </div>

      <div
        className="p-5 rounded-2xl"
        style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", boxShadow: "var(--ast-card-shadow)" }}
      >
        <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--ast-text2)" }}>
          Restoran / İşletme Adı
        </label>
        <input
          value={isim}
          onChange={(e) => setIsim(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !yukleniyor && olustur()}
          placeholder="örn. Lezzet Durağı"
          autoFocus
          style={{
            background: "var(--ast-input-bg)",
            border: "1px solid var(--ast-input-border)",
            color: "var(--ast-input-text)",
            borderRadius: 12, padding: "10px 14px",
            fontSize: 14, outline: "none", width: "100%",
          }}
        />
        {hata && (
          <p
            className="text-xs mt-2 p-2.5 rounded-xl"
            style={{ background: "var(--ast-error-bg)", border: "1px solid var(--ast-error-border)", color: "var(--ast-error-text)" }}
          >
            {hata}
          </p>
        )}
        <button
          onClick={olustur}
          disabled={yukleniyor}
          className="w-full mt-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}
        >
          {yukleniyor ? "Oluşturuluyor..." : "Restoranımı Kur →"}
        </button>
      </div>
    </div>
  );
}
