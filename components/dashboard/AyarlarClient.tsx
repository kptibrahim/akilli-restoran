"use client";

import { useState, useRef } from "react";
import MenuGorselImport from "./MenuGorselImport";
import { DIL_BAYRAK, TUM_DILLER } from "@/lib/translate";
import { TIMEZONE_SECENEKLERI, DEFAULT_TZ } from "@/lib/timezone";

function DilSecici({ seciliDiller, onToggle, renk }: { seciliDiller: string[]; onToggle: (kod: string) => void; renk: string }) {
  const [acik, setAcik] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {seciliDiller.map((kod) => {
          const info = DIL_BAYRAK[kod];
          if (!info) return null;
          const zorunlu = kod === "tr";
          return (
            <div key={kod}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm font-semibold"
              style={{ borderColor: renk, backgroundColor: renk + "15", color: renk }}>
              <span>{info.bayrak}</span>
              <span>{info.kisaltma}</span>
              {!zorunlu && (
                <button onClick={() => onToggle(kod)}
                  className="ml-1 w-4 h-4 flex items-center justify-center rounded-full text-xs font-bold"
                  style={{ color: renk }}>×</button>
              )}
            </div>
          );
        })}
        <button onClick={() => setAcik((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-dashed text-sm"
          style={{ borderColor: "var(--ast-divider)", color: "var(--ast-text2)" }}>
          <span>{acik ? "−" : "+"}</span>
          <span>{acik ? "Kapat" : "Dil Ekle"}</span>
        </button>
      </div>
      {acik && (
        <div className="rounded-xl p-3 mb-2" style={{ border: "1px solid var(--ast-divider)", background: "var(--ast-icon-bg)" }}>
          <p className="text-[11px] mb-2 font-medium" style={{ color: "var(--ast-text3)" }}>Eklemek istediğiniz dillere tıklayın:</p>
          <div className="grid grid-cols-3 gap-1.5">
            {TUM_DILLER.filter((kod) => kod !== "tr").map((kod) => {
              const info = DIL_BAYRAK[kod];
              const aktif = seciliDiller.includes(kod);
              return (
                <button key={kod} onClick={() => onToggle(kod)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl border-2 transition-all text-left"
                  style={aktif
                    ? { borderColor: renk, backgroundColor: renk + "12" }
                    : { borderColor: "var(--ast-divider)", backgroundColor: "var(--ast-card-bg)" }}>
                  <span className="text-base flex-shrink-0">{info.bayrak}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold truncate" style={{ color: "var(--ast-text1)" }}>{info.kisaltma}</p>
                    <p className="text-[9px] truncate" style={{ color: "var(--ast-text3)" }}>{info.isim}</p>
                  </div>
                  {aktif && <span className="text-xs flex-shrink-0" style={{ color: renk }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type Restoran = {
  id: string; isim: string; slug: string; renk: string;
  logo: string | null; aciklama: string | null;
  sosyalMedya: Record<string, string> | null; selectedLanguages: string[] | null;
  wifiAdi: string | null; wifiSifre: string | null;
  pin_yonetici: string | null; pin_kasiyer: string | null; pin_mutfak: string | null;
  timezone: string | null;
};

export default function AyarlarClient({ restoran }: { restoran: Restoran }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const menuUrl = `${origin}/${restoran.slug}`;
  const sosyal = restoran.sosyalMedya ?? {};
  const baslangicDiller = restoran.selectedLanguages ?? ["tr"];

  const [pinForm, setPinForm] = useState({
    pinYonetici: restoran.pin_yonetici ?? "",
    pinKasiyer: restoran.pin_kasiyer ?? "",
    pinMutfak: restoran.pin_mutfak ?? "",
  });
  const [pinGoster, setPinGoster] = useState({ pinYonetici: false, pinKasiyer: false, pinMutfak: false });
  const [pinKaydediliyor, setPinKaydediliyor] = useState(false);
  const [pinBasarili, setPinBasarili] = useState(false);
  const [pinHata, setPinHata] = useState("");

  async function pinKaydet() {
    if (pinForm.pinYonetici && !/^\d{6}$/.test(pinForm.pinYonetici)) {
      setPinHata("Yönetici PIN tam 6 rakam olmalı"); return;
    }
    if (pinForm.pinKasiyer && !/^\d{6}$/.test(pinForm.pinKasiyer)) {
      setPinHata("Kasiyer PIN tam 6 rakam olmalı"); return;
    }
    if (pinForm.pinMutfak && !/^\d{6}$/.test(pinForm.pinMutfak)) {
      setPinHata("Mutfak PIN tam 6 rakam olmalı"); return;
    }
    setPinHata(""); setPinKaydediliyor(true);
    const res = await fetch("/api/restoran/pins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pinYonetici: pinForm.pinYonetici || null,
        pinKasiyer: pinForm.pinKasiyer || null,
        pinMutfak: pinForm.pinMutfak || null,
      }),
    });
    setPinKaydediliyor(false);
    if (res.ok) {
      setPinBasarili(true);
      setTimeout(() => setPinBasarili(false), 3000);
    } else {
      const json = await res.json();
      setPinHata(json.error ?? "Kayıt başarısız");
    }
  }

  const [sifreGonderiyor, setSifreGonderiyor] = useState(false);
  const [sifreGonderildi, setSifreGonderildi] = useState(false);
  const [sifreGonderHata, setSifreGonderHata] = useState("");

  async function sifreDegistirTalep() {
    setSifreGonderHata("");
    setSifreGonderiyor(true);
    try {
      const res = await fetch("/api/restoran/sifre-degistir", { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setSifreGonderHata(json.error ?? "Bir hata oluştu."); return; }
      setSifreGonderildi(true);
      setTimeout(() => setSifreGonderildi(false), 8000);
    } catch {
      setSifreGonderHata("Bağlantı hatası.");
    } finally {
      setSifreGonderiyor(false);
    }
  }

  const [duzenle, setDuzenle] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [logoYukleniyor, setLogoYukleniyor] = useState(false);
  const [hata, setHata] = useState("");
  const [basarili, setBasarili] = useState(false);
  const [ceviriYenileniyor, setCeviriYenileniyor] = useState(false);
  const [ceviriSonuc, setCeviriSonuc] = useState<string | null>(null);
  const [seciliDiller, setSeciliDiller] = useState<string[]>(baslangicDiller);
  const [form, setForm] = useState({
    isim: restoran.isim, aciklama: restoran.aciklama ?? "", renk: restoran.renk,
    logo: restoran.logo ?? "", instagram: sosyal.instagram ?? "",
    facebook: sosyal.facebook ?? "", whatsapp: sosyal.whatsapp ?? "",
    website: sosyal.website ?? "", adres: sosyal.adres ?? "",
    acilisSaati: sosyal.acilisSaati ?? "", kapanisSaati: sosyal.kapanisSaati ?? "",
    wifiAdi: restoran.wifiAdi ?? "", wifiSifre: restoran.wifiSifre ?? "",
    timezone: restoran.timezone ?? DEFAULT_TZ,
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  function guncelle(alan: keyof typeof form, deger: string) {
    setForm((prev) => ({ ...prev, [alan]: deger }));
  }
  function dilToggle(kod: string) {
    if (kod === "tr") return;
    setSeciliDiller((prev) => prev.includes(kod) ? prev.filter((d) => d !== kod) : [...prev, kod]);
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

  async function cevirileriYenile(diller?: string[]) {
    const hedefDiller = (diller ?? seciliDiller).filter((d) => d !== "tr");
    if (!hedefDiller.length) return;
    setCeviriYenileniyor(true);
    setCeviriSonuc(null);
    const res = await fetch("/api/menu/cevirileri-guncelle", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoranId: restoran.id }),
    });
    const json = await res.json();
    setCeviriYenileniyor(false);
    if (res.ok && json.basarili) {
      const istat = json.istatistik;
      setCeviriSonuc(istat
        ? `✓ ${istat.kategoriler} kategori, ${istat.urunler} ürün → ${istat.diller.join(", ")} diline çevrildi`
        : "✓ Çeviriler güncellendi");
    } else {
      setCeviriSonuc("⚠ " + (json.error ?? "Hata oluştu"));
    }
    setTimeout(() => setCeviriSonuc(null), 8000);
  }

  async function kaydet() {
    if (!form.isim.trim()) { setHata("Restoran adı boş olamaz."); return; }
    setHata(""); setBasarili(false); setKaydediliyor(true);
    const sosyalMedya: Record<string, string> = {};
    if (form.instagram) sosyalMedya.instagram = form.instagram;
    if (form.facebook) sosyalMedya.facebook = form.facebook;
    if (form.whatsapp) sosyalMedya.whatsapp = form.whatsapp;
    if (form.website) sosyalMedya.website = form.website;
    if (form.adres) sosyalMedya.adres = form.adres;
    if (form.acilisSaati) sosyalMedya.acilisSaati = form.acilisSaati;
    if (form.kapanisSaati) sosyalMedya.kapanisSaati = form.kapanisSaati;
    const res = await fetch("/api/restoran", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isim: form.isim, logo: form.logo || null, aciklama: form.aciklama || null,
        renk: form.renk, sosyalMedya: Object.keys(sosyalMedya).length > 0 ? sosyalMedya : null,
        selectedLanguages: seciliDiller,
        wifiAdi: form.wifiAdi || null, wifiSifre: form.wifiSifre || null,
        timezone: form.timezone,
      }),
    });
    const json = await res.json();
    setKaydediliyor(false);
    if (!res.ok || json.error) { setHata(json.error ?? "Kayıt başarısız."); return; }
    setBasarili(true); setDuzenle(false);
    setTimeout(() => setBasarili(false), 3000);
    const yeniDiller = seciliDiller.filter((d) => d !== "tr" && !baslangicDiller.includes(d));
    if (yeniDiller.length > 0 || seciliDiller.filter((d) => d !== "tr").length > 0) {
      await cevirileriYenile(seciliDiller);
    }
  }

  const cardStyle = {
    background: "var(--ast-card-bg)",
    border: "1px solid var(--ast-card-border)",
    boxShadow: "var(--ast-card-shadow)",
    borderRadius: 16,
  };

  const inputStyle = {
    background: "var(--ast-input-bg)",
    border: "1px solid var(--ast-input-border)",
    color: "var(--ast-input-text)",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    width: "100%",
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl" style={{ paddingBottom: 100 }}>
      <div className="mb-7">
        <h1 className="text-2xl font-black" style={{ color: "var(--ast-text1)" }}>Ayarlar & QR</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--ast-text2)" }}>Restoran bilgileri ve QR kod</p>
      </div>

      {/* Restoran Bilgisi */}
      <div className="p-5 mb-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
            <span style={{ color: "var(--ast-gold)" }}>◈</span> Restoran Bilgisi
          </h2>
          {!duzenle && (
            <button onClick={() => setDuzenle(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ color: "var(--ast-gold)", border: "1px solid var(--ast-divider)", background: "var(--ast-icon-bg)" }}>
              ✏️ Düzenle
            </button>
          )}
        </div>

        {basarili && (
          <div className="rounded-xl px-4 py-2.5 text-xs font-semibold mb-4"
            style={{ background: "var(--ast-success-bg)", border: "1px solid var(--ast-success-border)", color: "var(--ast-success-text)" }}>
            ✓ Bilgiler başarıyla kaydedildi
          </div>
        )}

        {!duzenle ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "var(--ast-icon-bg)" }}>
              {form.logo ? (
                <img src={form.logo} alt="logo" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0"
                  style={{ backgroundColor: form.renk }}>
                  {form.isim[0]}
                </div>
              )}
              <div>
                <p className="font-bold text-lg" style={{ color: "var(--ast-text1)" }}>{form.isim}</p>
                {form.aciklama && <p className="text-xs mt-0.5" style={{ color: "var(--ast-text2)" }}>{form.aciklama}</p>}
                <p className="text-sm" style={{ color: "var(--ast-text3)" }}>/{restoran.slug}</p>
              </div>
            </div>
            <div className="mt-2 text-xs" style={{ color: "var(--ast-text3)" }}>
              🌍 {TIMEZONE_SECENEKLERI.find(t => t.value === form.timezone)?.label ?? form.timezone}
            </div>
            {(form.instagram || form.facebook || form.whatsapp || form.website || form.adres || form.acilisSaati) && (
              <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--ast-text2)" }}>
                {(form.acilisSaati || form.kapanisSaati) && (
                  <span className="truncate col-span-2">🕐 {form.acilisSaati || "?"} – {form.kapanisSaati || "?"}</span>
                )}
                {form.instagram && <span className="truncate">📸 {form.instagram}</span>}
                {form.facebook && <span className="truncate">👤 {form.facebook}</span>}
                {form.whatsapp && <span className="truncate">💬 {form.whatsapp}</span>}
                {form.website && <span className="truncate">🌐 {form.website}</span>}
                {form.adres && <span className="truncate col-span-2">📍 {form.adres}</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Logo */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--ast-text2)" }}>Logo / Arka Plan Fotoğrafı</label>
              <div className="flex items-center gap-3">
                {form.logo ? (
                  <img src={form.logo} alt="logo" className="w-14 h-14 rounded-xl object-cover shrink-0" style={{ border: "1px solid var(--ast-divider)" }} />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: "var(--ast-icon-bg)", border: "1px solid var(--ast-divider)" }}>📷</div>
                )}
                <div className="flex-1 space-y-1.5">
                  <button onClick={() => logoInputRef.current?.click()} disabled={logoYukleniyor}
                    className="w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-60"
                    style={{ border: "1px solid var(--ast-gold)", color: "var(--ast-gold)", background: "var(--ast-icon-bg)" }}>
                    {logoYukleniyor ? "Yükleniyor..." : "Fotoğraf Yükle"}
                  </button>
                  <input value={form.logo} onChange={(e) => guncelle("logo", e.target.value)}
                    style={{ ...inputStyle, padding: "6px 10px", fontSize: 12 }}
                    placeholder="veya URL yapıştırın" />
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={logoYukle} />
              </div>
            </div>

            {/* Temel bilgiler */}
            <div className="space-y-3">
              {[
                { alan: "isim" as const, label: "Restoran Adı *", placeholder: "Restoran adı" },
                { alan: "aciklama" as const, label: "Kısa Açıklama / Slogan", placeholder: "örn. Taze & Lezzetli" },
              ].map(({ alan, label, placeholder }) => (
                <div key={alan}>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--ast-text2)" }}>{label}</label>
                  <input value={form[alan]} onChange={(e) => guncelle(alan, e.target.value)}
                    style={inputStyle} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--ast-text2)" }}>Marka Rengi</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.renk} onChange={(e) => guncelle("renk", e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer p-0.5"
                    style={{ border: "1px solid var(--ast-divider)" }} />
                  <span className="text-sm font-mono" style={{ color: "var(--ast-text2)" }}>{form.renk}</span>
                </div>
              </div>
            </div>

            {/* Çalışma Saatleri */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--ast-text2)" }}>Çalışma Saatleri</p>
              <div className="flex gap-3">
                {[
                  { alan: "acilisSaati" as const, label: "Açılış" },
                  { alan: "kapanisSaati" as const, label: "Kapanış" },
                ].map(({ alan, label }) => (
                  <div key={alan} className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: "var(--ast-text3)" }}>{label}</label>
                    <input type="time" value={form[alan]} onChange={(e) => guncelle(alan, e.target.value)} style={inputStyle} />
                  </div>
                ))}
              </div>
            </div>

            {/* Zaman Dilimi */}
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--ast-text2)" }}>Zaman Dilimi</p>
              <select
                value={form.timezone}
                onChange={(e) => guncelle("timezone", e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {TIMEZONE_SECENEKLERI.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Sosyal Medya */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--ast-text2)" }}>Sosyal Medya & İletişim</p>
              <div className="space-y-2">
                {[
                  { alan: "instagram" as const, placeholder: "https://instagram.com/...", icon: "📸" },
                  { alan: "facebook" as const, placeholder: "https://facebook.com/...", icon: "👤" },
                  { alan: "whatsapp" as const, placeholder: "+905XXXXXXXXX", icon: "💬" },
                  { alan: "website" as const, placeholder: "https://restoraniniz.com", icon: "🌐" },
                  { alan: "adres" as const, placeholder: "Tam adresiniz", icon: "📍" },
                ].map(({ alan, placeholder, icon }) => (
                  <div key={alan} className="flex items-center gap-2">
                    <span className="text-base w-6 shrink-0">{icon}</span>
                    <input value={form[alan]} onChange={(e) => guncelle(alan, e.target.value)}
                      style={{ ...inputStyle }} placeholder={placeholder} />
                  </div>
                ))}
              </div>
            </div>

            {hata && (
              <p className="text-xs p-3 rounded-xl" style={{ background: "var(--ast-error-bg)", border: "1px solid var(--ast-error-border)", color: "var(--ast-error-text)" }}>
                {hata}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setDuzenle(false); setHata(""); setSeciliDiller(baslangicDiller); }}
                className="flex-1 py-3 rounded-xl text-sm"
                style={{ border: "1px solid var(--ast-divider)", color: "var(--ast-text2)", background: "var(--ast-badge-bg)" }}>
                İptal
              </button>
              <button onClick={kaydet} disabled={kaydediliyor}
                className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
                {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* WiFi Bilgileri */}
      <div className="p-5" style={cardStyle}>
        <h2 className="font-bold mb-1 flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
          <span style={{ color: "var(--ast-gold)" }}>📶</span> Wi-Fi Bilgileri
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--ast-text2)" }}>
          Müşteriler giriş ekranında Wi-Fi butonuna basınca bu bilgileri görecek.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--ast-text2)" }}>Ağ Adı (SSID)</label>
            <input
              value={form.wifiAdi}
              onChange={(e) => guncelle("wifiAdi", e.target.value)}
              style={inputStyle}
              placeholder="örn. Restoran_WiFi"
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--ast-text2)" }}>Wi-Fi Şifresi</label>
            <input
              value={form.wifiSifre}
              onChange={(e) => guncelle("wifiSifre", e.target.value)}
              style={inputStyle}
              placeholder="örn. misafir1234"
            />
          </div>
        </div>
        <button
          onClick={kaydet}
          disabled={kaydediliyor}
          className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
          {kaydediliyor ? "Kaydediliyor..." : "Wi-Fi Bilgilerini Kaydet"}
        </button>
      </div>

      {/* Personel PIN Kodları */}
      <div className="p-5" style={cardStyle}>
        <h2 className="font-bold mb-1 flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
          <span style={{ color: "var(--ast-gold)" }}>🔐</span> Personel PIN Kodları
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--ast-text2)" }}>
          Her rol için 6 haneli PIN belirle. Boş bırakılan rol devre dışı kalır. Yönetici PIN boş bırakılırsa doğrudan giriş yapılır.
        </p>
        <div className="space-y-3">
          {([
            { label: "Yönetici PIN", key: "pinYonetici" as const, aciklama: "Tam erişim — boş bırakılırsa PIN sorulmaz" },
            { label: "Kasiyer PIN", key: "pinKasiyer" as const, aciklama: "Siparişler + Kasa erişimi" },
            { label: "Mutfak PIN", key: "pinMutfak" as const, aciklama: "Sadece Siparişler erişimi" },
          ] as const).map(({ label, key, aciklama }) => (
            <div key={key}>
              <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--ast-text2)" }}>
                {label}{" "}
                <span className="font-normal" style={{ color: "var(--ast-text3)" }}>— {aciklama}</span>
              </label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    type={pinGoster[key] ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={pinForm[key]}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setPinForm((p) => ({ ...p, [key]: val }));
                    }}
                    placeholder="6 haneli PIN (örn. 123456)"
                    style={{ ...inputStyle, paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setPinGoster((p) => ({ ...p, [key]: !p[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                    style={{ color: "var(--ast-gold)", background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}
                  >
                    {pinGoster[key] ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {pinForm[key] && (
                  <button
                    onClick={() => setPinForm((p) => ({ ...p, [key]: "" }))}
                    className="px-3 rounded-xl text-xs font-semibold shrink-0"
                    style={{ border: "1px solid var(--ast-error-border)", color: "var(--ast-error-text)", background: "var(--ast-error-bg)" }}
                  >
                    Sil
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {pinHata && (
          <p className="text-xs mt-3 p-2.5 rounded-xl"
            style={{ background: "var(--ast-error-bg)", border: "1px solid var(--ast-error-border)", color: "var(--ast-error-text)" }}>
            {pinHata}
          </p>
        )}
        {pinBasarili && (
          <p className="text-xs mt-3 p-2.5 rounded-xl"
            style={{ background: "var(--ast-success-bg)", border: "1px solid var(--ast-success-border)", color: "var(--ast-success-text)" }}>
            ✓ PIN kodları kaydedildi
          </p>
        )}
        <button
          onClick={pinKaydet}
          disabled={pinKaydediliyor}
          className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}
        >
          {pinKaydediliyor ? "Kaydediliyor..." : "PIN Kodlarını Kaydet"}
        </button>
      </div>

      {/* Giriş Şifresi */}
      <div className="p-5" style={cardStyle}>
        <h2 className="font-bold mb-1 flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
          <span style={{ color: "var(--ast-gold)" }}>🔑</span> Giriş Şifresi
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--ast-text2)" }}>
          Panele giriş şifrenizi değiştirmek için onay maili gönderilir. Linke tıklayarak yeni şifre belirlersiniz.
        </p>
        {sifreGonderildi ? (
          <p className="text-xs p-2.5 rounded-xl"
            style={{ background: "var(--ast-success-bg)", border: "1px solid var(--ast-success-border)", color: "var(--ast-success-text)" }}>
            ✓ Şifre değiştirme bağlantısı emailinize gönderildi. 30 dakika geçerlidir.
          </p>
        ) : (
          <>
            {sifreGonderHata && (
              <p className="text-xs mb-3 p-2.5 rounded-xl"
                style={{ background: "var(--ast-error-bg)", border: "1px solid var(--ast-error-border)", color: "var(--ast-error-text)" }}>
                {sifreGonderHata}
              </p>
            )}
            <button
              onClick={sifreDegistirTalep}
              disabled={sifreGonderiyor}
              className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
              style={{ border: "1px solid var(--ast-gold)", color: "var(--ast-gold)", background: "var(--ast-icon-bg)" }}>
              {sifreGonderiyor ? "Gönderiliyor..." : "Şifre Değiştirme Bağlantısı Gönder"}
            </button>
          </>
        )}
      </div>

      {/* Dil Ayarları */}
      <div className="p-5" style={cardStyle}>
        <h2 className="font-bold mb-1 flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
          <span style={{ color: "var(--ast-gold)" }}>🌐</span> Menü Dilleri
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--ast-text2)" }}>
          Müşteriler hangi dillerde menüyü görebilsin? Seçilen diller için çeviriler otomatik yapılır.
        </p>
        <DilSecici seciliDiller={seciliDiller} onToggle={dilToggle} renk={restoran.renk} />
        <div className="flex gap-2">
          <button onClick={kaydet} disabled={kaydediliyor}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
            {kaydediliyor ? "Kaydediliyor..." : "Dilleri Kaydet"}
          </button>
          <button onClick={() => cevirileriYenile()}
            disabled={ceviriYenileniyor || seciliDiller.filter((d) => d !== "tr").length === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ border: "1px solid var(--ast-gold)", color: "var(--ast-gold)", background: "var(--ast-icon-bg)" }}>
            {ceviriYenileniyor ? "Çevriliyor..." : "Çevirileri Yenile"}
          </button>
        </div>
        {ceviriSonuc && (
          <p className="mt-3 text-xs rounded-xl px-3 py-2"
            style={{ background: "var(--ast-success-bg)", border: "1px solid var(--ast-success-border)", color: "var(--ast-success-text)" }}>
            {ceviriSonuc}
          </p>
        )}
      </div>

      {/* Menü Linki */}
      <div className="p-5" style={cardStyle}>
        <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
          <span style={{ color: "var(--ast-gold)" }}>🔗</span> Müşteri Menü Linki
        </h2>
        <div className="rounded-xl px-4 py-3 text-sm font-mono break-all mb-3"
          style={{ background: "var(--ast-icon-bg)", border: "1px solid var(--ast-divider)", color: "var(--ast-gold)" }}>
          {menuUrl}
        </div>
        <a href={`/${restoran.slug}`} target="_blank"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold"
          style={{ border: "1px solid var(--ast-gold)", color: "var(--ast-gold)", background: "var(--ast-icon-bg)" }}>
          🚀 Menüyü Aç
        </a>
      </div>

      {/* QR Kod */}
      <div className="p-5" style={cardStyle}>
        <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
          <span style={{ color: "var(--ast-gold)" }}>📱</span> QR Kod Yöneticisi
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--ast-text2)" }}>
          Her masa için özel QR kod oluşturun, müşteriler okutunca masa numaraları otomatik tanınır.
        </p>
        <a href="/dashboard/qr-kodlar"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
          📱 QR Kodlarımı Yönet
        </a>
      </div>

      </div>

      {/* PDF Yükle */}
      <div className="mt-4">
        <MenuGorselImport restoranId={restoran.id} />
      </div>
    </div>
  );
}
