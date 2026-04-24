"use client";

import { useState, useRef } from "react";
import MenuGorselImport from "./MenuGorselImport";

type Adim = "form" | "menu" | "gorsel";

export default function OnboardingClient({
  restoran,
}: {
  restoran: { id: string; isim: string; aciklama: string };
}) {
  const [adim, setAdim] = useState<Adim>("form");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [logoYukleniyor, setLogoYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    isim: restoran.isim,
    aciklama: restoran.aciklama,
    renk: "#C89434",
    logo: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
    website: "",
    adres: "",
    acilisSaati: "",
    kapanisSaati: "",
  });

  function guncelle(alan: keyof typeof form, deger: string) {
    setForm((prev) => ({ ...prev, [alan]: deger }));
  }

  async function logoYukle(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    e.target.value = "";
    setLogoYukleniyor(true);
    const fd = new FormData();
    fd.append("dosya", dosya);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setLogoYukleniyor(false);
    if (json.url) guncelle("logo", json.url);
  }

  async function kaydet() {
    setHata("");
    if (!form.isim.trim()) { setHata("Restoran adı boş olamaz."); return; }
    setYukleniyor(true);
    try {
      const sosyalMedya: Record<string, string> = {};
      if (form.instagram) sosyalMedya.instagram = form.instagram;
      if (form.facebook) sosyalMedya.facebook = form.facebook;
      if (form.whatsapp) sosyalMedya.whatsapp = form.whatsapp;
      if (form.website) sosyalMedya.website = form.website;
      if (form.adres) sosyalMedya.adres = form.adres;
      if (form.acilisSaati) sosyalMedya.acilisSaati = form.acilisSaati;
      if (form.kapanisSaati) sosyalMedya.kapanisSaati = form.kapanisSaati;

      const res = await fetch("/api/restoran", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isim: form.isim.trim(),
          aciklama: form.aciklama.trim() || null,
          renk: form.renk,
          logo: form.logo || null,
          sosyalMedya: Object.keys(sosyalMedya).length > 0 ? sosyalMedya : null,
        }),
      });
      if (!res.ok) { setHata("Kaydedilemedi. Tekrar deneyin."); return; }
      setAdim("menu");
    } catch {
      setHata("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--ast-input-bg)",
    border: "1px solid var(--ast-input-border)",
    color: "var(--ast-input-text)",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    color: "var(--ast-text2)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 6,
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--ast-card-bg)",
    border: "1px solid var(--ast-card-border)",
    borderRadius: 16,
    boxShadow: "var(--ast-card-shadow)",
  };

  const altinButon: React.CSSProperties = {
    background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C8832A 100%)",
    color: "#0A0705",
    border: "none",
    borderRadius: 12,
    padding: "13px 24px",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "0.06em",
    cursor: "pointer",
    width: "100%",
  };

  const ikinciButon: React.CSSProperties = {
    background: "var(--ast-input-bg)",
    color: "var(--ast-text2)",
    border: "1px solid var(--ast-card-border)",
    borderRadius: 12,
    padding: "13px 24px",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    width: "100%",
  };

  /* ── Menü sorusu ── */
  if (adim === "menu") {
    return (
      <div className="max-w-md mx-auto p-4 pt-16 flex flex-col items-center gap-6">
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #C89434, #E8B84B)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
          }}>✓</div>
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

  /* ── Menü görsel import ── */
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
        <button onClick={() => window.location.href = "/dashboard"} style={{ ...ikinciButon, marginTop: 16 }}>
          Dashboard'a Git
        </button>
      </div>
    );
  }

  /* ── Bilgi formu ── */
  return (
    <div className="max-w-lg mx-auto p-4 pt-6" style={{ paddingBottom: 80 }}>
      {/* Üst not */}
      <div style={{
        background: "rgba(200,148,52,0.08)",
        border: "1px solid rgba(200,148,52,0.25)",
        borderRadius: 12,
        padding: "10px 14px",
        marginBottom: 20,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
        <p style={{ color: "var(--ast-text2)", fontSize: 12, lineHeight: 1.6 }}>
          İstediğiniz zaman <strong style={{ color: "var(--ast-text1)" }}>Ayarlar</strong> sayfasından bu bilgileri değiştirebilirsiniz.
        </p>
      </div>

      <div style={{ ...cardStyle, padding: 24 }}>
        <h2 style={{ color: "var(--ast-text1)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Kayıtınızı Tamamlayalım
        </h2>
        <p style={{ color: "var(--ast-text2)", fontSize: 13, marginBottom: 24 }}>
          Restoranınız hakkında bilgileri girin.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Logo */}
          <div>
            <label style={labelStyle}>Logo / Kapak Fotoğrafı</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {form.logo ? (
                <img src={form.logo} alt="logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0, border: "1px solid var(--ast-divider)" }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--ast-icon-bg)", border: "1px solid var(--ast-divider)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📷</div>
              )}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoYukleniyor}
                  style={{ ...ikinciButon, padding: "8px 14px", fontSize: 12, opacity: logoYukleniyor ? 0.6 : 1, border: "1px solid var(--ast-gold)", color: "var(--ast-gold)" }}
                >
                  {logoYukleniyor ? "Yükleniyor..." : "Fotoğraf Yükle"}
                </button>
                <input
                  value={form.logo}
                  onChange={(e) => guncelle("logo", e.target.value)}
                  style={{ ...inputStyle, padding: "6px 10px", fontSize: 12 }}
                  placeholder="veya URL yapıştırın"
                />
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={logoYukle} />
            </div>
          </div>

          {/* Restoran adı */}
          <div>
            <label style={labelStyle}>Restoran / İşletme Adı *</label>
            <input
              type="text"
              value={form.isim}
              onChange={(e) => guncelle("isim", e.target.value)}
              style={inputStyle}
              placeholder="Lezzet Durağı"
            />
          </div>

          {/* Slogan */}
          <div>
            <label style={labelStyle}>Slogan / Kısa Açıklama</label>
            <input
              type="text"
              value={form.aciklama}
              onChange={(e) => guncelle("aciklama", e.target.value)}
              style={inputStyle}
              placeholder="örn. En taze malzemelerle hazırlanan ev yemekleri"
            />
          </div>

          {/* Marka rengi */}
          <div>
            <label style={labelStyle}>Marka Rengi</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="color"
                value={form.renk}
                onChange={(e) => guncelle("renk", e.target.value)}
                style={{ width: 44, height: 44, borderRadius: 10, cursor: "pointer", padding: 3, border: "1px solid var(--ast-divider)", background: "none" }}
              />
              <span style={{ color: "var(--ast-text2)", fontSize: 13, fontFamily: "monospace" }}>{form.renk}</span>
            </div>
          </div>

          {/* Çalışma saatleri */}
          <div>
            <label style={labelStyle}>Çalışma Saatleri</label>
            <div style={{ display: "flex", gap: 12 }}>
              {([
                { alan: "acilisSaati" as const, label: "Açılış" },
                { alan: "kapanisSaati" as const, label: "Kapanış" },
              ]).map(({ alan, label }) => (
                <div key={alan} style={{ flex: 1 }}>
                  <label style={{ ...labelStyle, textTransform: "none", fontWeight: 400, fontSize: 11, marginBottom: 4 }}>{label}</label>
                  <input type="time" value={form[alan]} onChange={(e) => guncelle(alan, e.target.value)} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>

          {/* Sosyal medya & iletişim */}
          <div>
            <label style={labelStyle}>Sosyal Medya & İletişim</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {([
                { alan: "instagram" as const, placeholder: "https://instagram.com/restoraniniz", icon: "📸" },
                { alan: "facebook" as const, placeholder: "https://facebook.com/restoraniniz", icon: "👤" },
                { alan: "whatsapp" as const, placeholder: "+905XXXXXXXXX", icon: "💬" },
                { alan: "website" as const, placeholder: "https://restoraniniz.com", icon: "🌐" },
                { alan: "adres" as const, placeholder: "Tam adresiniz", icon: "📍" },
              ]).map(({ alan, placeholder, icon }) => (
                <div key={alan} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, width: 24, flexShrink: 0 }}>{icon}</span>
                  <input
                    value={form[alan]}
                    onChange={(e) => guncelle(alan, e.target.value)}
                    style={inputStyle}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          {hata && (
            <div style={{ background: "rgba(139,26,42,0.15)", border: "1px solid rgba(139,26,42,0.4)", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ color: "#F87B8A", fontSize: 12 }}>{hata}</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
            <button onClick={kaydet} disabled={yukleniyor} style={{ ...altinButon, opacity: yukleniyor ? 0.6 : 1 }}>
              {yukleniyor ? "Kaydediliyor..." : "Kaydet ve Devam Et →"}
            </button>
            <button onClick={() => window.location.href = "/dashboard"} style={ikinciButon}>
              Daha Sonra
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
