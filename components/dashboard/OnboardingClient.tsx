"use client";

import { useState } from "react";
import MenuGorselImport from "./MenuGorselImport";

type Adim = "form" | "menu" | "gorsel";

export default function OnboardingClient({
  restoran,
}: {
  restoran: { id: string; isim: string; aciklama: string };
}) {
  const [adim, setAdim] = useState<Adim>("form");
  const [isim, setIsim] = useState(restoran.isim);
  const [aciklama, setAciklama] = useState(restoran.aciklama);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState("");

  async function kaydet() {
    setHata("");
    if (!isim.trim()) { setHata("Restoran adı boş olamaz."); return; }
    setYukleniyor(true);
    try {
      const res = await fetch("/api/restoran", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isim: isim.trim(), aciklama: aciklama.trim() }),
      });
      if (!res.ok) { setHata("Kaydedilemedi. Tekrar deneyin."); return; }
      setAdim("menu");
    } catch {
      setHata("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--ast-card-bg)",
    border: "1px solid var(--ast-card-border)",
    borderRadius: 20,
    boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--ast-input-bg)",
    border: "1px solid var(--ast-input-border)",
    color: "var(--ast-input-text)",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14,
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    color: "var(--ast-text2)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 8,
  };

  const altinButon: React.CSSProperties = {
    background: "linear-gradient(135deg, var(--ast-gold) 0%, #E8B84B 50%, #C8832A 100%)",
    color: "#0A0705",
    border: "none",
    borderRadius: 12,
    padding: "13px 24px",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "0.08em",
    cursor: "pointer",
    width: "100%",
  };

  const ikinciButon: React.CSSProperties = {
    background: "var(--ast-input-bg)",
    color: "var(--ast-text1)",
    border: "1px solid var(--ast-card-border)",
    borderRadius: 12,
    padding: "13px 24px",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    width: "100%",
  };

  if (adim === "gorsel") {
    return (
      <div className="max-w-2xl mx-auto p-4 pt-8">
        <div className="mb-6">
          <h2 style={{ color: "var(--ast-text1)", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            Menü Görseli Yükle
          </h2>
          <p style={{ color: "var(--ast-text2)", fontSize: 13 }}>
            Menü görselinizi yükleyin, yapay zeka otomatik olarak ürünleri oluştursun.
          </p>
        </div>
        <MenuGorselImport restoranId={restoran.id} />
        <button
          onClick={() => window.location.href = "/dashboard"}
          style={{ ...ikinciButon, marginTop: 16 }}
        >
          Dashboard'a Git
        </button>
      </div>
    );
  }

  if (adim === "menu") {
    return (
      <div className="max-w-md mx-auto p-4 pt-16 flex flex-col items-center gap-6">
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px",
            background: "linear-gradient(135deg, var(--ast-gold) 0%, #E8B84B 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>
            ✓
          </div>
          <h2 style={{ color: "var(--ast-text1)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Bilgiler kaydedildi!
          </h2>
          <p style={{ color: "var(--ast-text2)", fontSize: 14 }}>
            Menünüzü hemen yüklemek ister misiniz?
          </p>
          <p style={{ color: "var(--ast-text3)", fontSize: 12, marginTop: 6 }}>
            Bir menü görseli veya PDF yükleyin, yapay zeka ürünlerinizi otomatik oluştursun.
          </p>
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => setAdim("gorsel")} style={altinButon}>
            Evet, Menümü Yükleyelim
          </button>
          <button onClick={() => window.location.href = "/dashboard"} style={ikinciButon}>
            Hayır, Daha Sonra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 pt-8">
      {/* Not */}
      <div style={{
        background: "rgba(200,148,52,0.08)",
        border: "1px solid rgba(200,148,52,0.25)",
        borderRadius: 12,
        padding: "10px 14px",
        marginBottom: 24,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 14 }}>ℹ️</span>
        <p style={{ color: "var(--ast-text2)", fontSize: 12, lineHeight: 1.5 }}>
          Bu bilgileri daha sonra <strong style={{ color: "var(--ast-text1)" }}>Ayarlar</strong> sayfasından değiştirebilirsiniz.
        </p>
      </div>

      <div style={cardStyle} className="p-6">
        <h2 style={{ color: "var(--ast-text1)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Kayıtınızı Tamamlayalım
        </h2>
        <p style={{ color: "var(--ast-text2)", fontSize: 13, marginBottom: 24 }}>
          Restoranınız hakkında birkaç bilgi girin.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Restoran Adı */}
          <div>
            <label style={labelStyle}>Restoran / İşletme Adı</label>
            <input
              type="text"
              value={isim}
              onChange={(e) => setIsim(e.target.value)}
              style={inputStyle}
              placeholder="Lezzet Durağı"
            />
          </div>

          {/* Slogan / Açıklama */}
          <div>
            <label style={labelStyle}>Slogan / Kısa Açıklama</label>
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "none" }}
              placeholder="Örn: En taze malzemelerle hazırlanan ev yemekleri"
            />
          </div>

          {hata && (
            <div style={{ background: "rgba(139,26,42,0.15)", border: "1px solid rgba(139,26,42,0.4)", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ color: "#F87B8A", fontSize: 12 }}>{hata}</p>
            </div>
          )}

          <button
            onClick={kaydet}
            disabled={yukleniyor}
            style={{ ...altinButon, opacity: yukleniyor ? 0.6 : 1 }}
          >
            {yukleniyor ? "Kaydediliyor..." : "Kaydet ve Devam Et"}
          </button>
        </div>
      </div>
    </div>
  );
}
