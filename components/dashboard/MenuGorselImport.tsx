"use client";

import { useState, useRef } from "react";

type UrunOnizleme = {
  isim: string;
  aciklama: string;
  fiyat: string;
};

type KategoriOnizleme = {
  isim: string;
  urunler: UrunOnizleme[];
};

type Adim = "bos" | "yukleniyor" | "analiz" | "onizleme" | "kaydediliyor" | "tamam" | "hata";

const cardStyle = {
  background: "var(--ast-card-bg)",
  border: "1px solid var(--ast-card-border)",
  borderRadius: 16,
};

const inputStyle = {
  background: "var(--ast-input-bg)",
  border: "1px solid var(--ast-input-border)",
  color: "var(--ast-input-text)",
  borderRadius: 10,
  padding: "7px 10px",
  fontSize: 12,
  outline: "none",
  width: "100%",
};

export default function MenuGorselImport({ restoranId }: { restoranId: string }) {
  const [adim, setAdim] = useState<Adim>("bos");
  const [hata, setHata] = useState("");
  const [onizleme, setOnizleme] = useState<KategoriOnizleme[]>([]);
  const [sonuc, setSonuc] = useState<{ kategoriSayisi: number; urunSayisi: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function gorselSec(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    e.target.value = "";

    setHata("");
    setSonuc(null);
    setAdim("yukleniyor");

    const form = new FormData();
    form.append("gorsel", dosya);
    form.append("restoranId", restoranId);

    setAdim("analiz");
    const res = await fetch("/api/menu/gorsel-import", { method: "POST", body: form });
    const json = await res.json();

    if (!res.ok || json.error) {
      setHata(json.error ?? "Analiz başarısız.");
      setAdim("hata");
      return;
    }

    const normalizedKats: KategoriOnizleme[] = (json.kategoriler ?? []).map(
      (k: { isim: string; urunler?: Array<{ isim: string; aciklama?: string | null; fiyat?: number }> }) => ({
        isim: k.isim,
        urunler: (k.urunler ?? []).map((u) => ({
          isim: u.isim,
          aciklama: u.aciklama ?? "",
          fiyat: String(u.fiyat ?? 0),
        })),
      })
    );

    setOnizleme(normalizedKats);
    setAdim("onizleme");
  }

  function katIsimGuncelle(katIdx: number, isim: string) {
    setOnizleme((prev) => prev.map((k, i) => (i === katIdx ? { ...k, isim } : k)));
  }

  function urunGuncelle(katIdx: number, urunIdx: number, alan: keyof UrunOnizleme, deger: string) {
    setOnizleme((prev) =>
      prev.map((k, i) =>
        i === katIdx
          ? { ...k, urunler: k.urunler.map((u, j) => (j === urunIdx ? { ...u, [alan]: deger } : u)) }
          : k
      )
    );
  }

  function urunSil(katIdx: number, urunIdx: number) {
    setOnizleme((prev) =>
      prev.map((k, i) =>
        i === katIdx ? { ...k, urunler: k.urunler.filter((_, j) => j !== urunIdx) } : k
      )
    );
  }

  function katSil(katIdx: number) {
    setOnizleme((prev) => prev.filter((_, i) => i !== katIdx));
  }

  function urunEkle(katIdx: number) {
    setOnizleme((prev) =>
      prev.map((k, i) =>
        i === katIdx
          ? { ...k, urunler: [...k.urunler, { isim: "", aciklama: "", fiyat: "0" }] }
          : k
      )
    );
  }

  async function onayla() {
    setAdim("kaydediliyor");

    const payload = onizleme
      .map((k) => ({
        isim: k.isim,
        urunler: k.urunler
          .filter((u) => u.isim.trim())
          .map((u) => ({
            isim: u.isim,
            aciklama: u.aciklama || null,
            fiyat: parseFloat(u.fiyat) || 0,
          })),
      }))
      .filter((k) => k.isim.trim() && k.urunler.length > 0);

    const res = await fetch("/api/menu/gorsel-import", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoranId, kategoriler: payload }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      setHata(json.error ?? "Kayıt başarısız.");
      setAdim("hata");
      return;
    }

    setSonuc({ kategoriSayisi: json.kategoriSayisi, urunSayisi: json.urunSayisi });
    setAdim("tamam");
  }

  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 className="font-bold" style={{ color: "var(--ast-text1)" }}>📸 Menü Görseli → Otomatik Aktarım</h2>
        <p className="text-xs mt-1" style={{ color: "var(--ast-text2)" }}>
          Menünüzün fotoğrafını yükleyin — yapay zeka okuyup düzenlenebilir liste sunar
        </p>
      </div>

      {/* ADIM: Boş veya Hata */}
      {(adim === "bos" || adim === "hata") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              border: "2px dashed var(--ast-divider)",
              borderRadius: 12,
              padding: "32px 16px",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
            <p className="text-sm font-medium" style={{ color: "var(--ast-text1)" }}>Menü fotoğrafını seçin</p>
            <p className="text-xs mt-1" style={{ color: "var(--ast-text3)" }}>JPG, PNG veya WEBP · Maks 20MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={gorselSec}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}
          >
            Görsel Seç ve Analiz Et
          </button>
          {hata && (
            <p className="text-xs p-3 rounded-xl"
              style={{ background: "var(--ast-error-bg)", border: "1px solid var(--ast-error-border)", color: "var(--ast-error-text)" }}>
              {hata}
            </p>
          )}
        </div>
      )}

      {/* ADIM: Analiz / Yükleme */}
      {(adim === "yukleniyor" || adim === "analiz") && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-12 h-12 rounded-full animate-spin"
            style={{ border: "4px solid var(--ast-divider)", borderTopColor: "var(--ast-gold)" }} />
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--ast-text1)" }}>
              {adim === "yukleniyor" ? "Görsel yükleniyor..." : "Yapay zeka menüyü okuyor..."}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--ast-text3)" }}>Bu 15-30 saniye sürebilir</p>
          </div>
        </div>
      )}

      {/* ADIM: Kaydediliyor */}
      {adim === "kaydediliyor" && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-12 h-12 rounded-full animate-spin"
            style={{ border: "4px solid var(--ast-divider)", borderTopColor: "var(--ast-success-text)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--ast-text1)" }}>Menü kaydediliyor...</p>
        </div>
      )}

      {/* ADIM: Tamamlandı */}
      {adim === "tamam" && sonuc && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="rounded-xl p-4"
            style={{ background: "var(--ast-success-bg)", border: "1px solid var(--ast-success-border)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--ast-success-text)" }}>✓ Menü başarıyla aktarıldı!</p>
            <p className="text-xs mt-1" style={{ color: "var(--ast-success-text)", opacity: 0.8 }}>
              {sonuc.kategoriSayisi} kategori, {sonuc.urunSayisi} ürün eklendi
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--ast-text3)" }}>Menü editöründen düzenleyebilirsiniz.</p>
          </div>
          <button
            onClick={() => { setAdim("bos"); setOnizleme([]); setSonuc(null); setHata(""); }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--ast-divider)", color: "var(--ast-text2)", background: "var(--ast-badge-bg)" }}
          >
            Yeni Menü Aktar
          </button>
        </div>
      )}

      {/* ADIM: Önizleme / Düzenleme */}
      {adim === "onizleme" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="rounded-xl p-3"
            style={{ background: "var(--ast-warn-bg)", border: "1px solid var(--ast-warn-border)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--ast-warn-text)" }}>
              AI {onizleme.length} kategori ve {onizleme.reduce((t, k) => t + k.urunler.length, 0)} ürün buldu
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--ast-text3)" }}>
              Kaydetmeden önce düzenleyebilirsiniz
            </p>
          </div>

          <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {onizleme.map((kat, katIdx) => (
              <div key={katIdx} style={{ border: "1px solid var(--ast-divider)", borderRadius: 12, overflow: "hidden" }}>
                {/* Kategori başlığı */}
                <div className="flex items-center gap-2 px-3 py-2"
                  style={{ background: "var(--ast-icon-bg)", borderBottom: "1px solid var(--ast-divider)" }}>
                  <input
                    value={kat.isim}
                    onChange={(e) => katIsimGuncelle(katIdx, e.target.value)}
                    className="flex-1 font-semibold text-sm outline-none"
                    style={{ background: "transparent", color: "var(--ast-text1)", border: "none" }}
                    placeholder="Kategori adı"
                  />
                  <button
                    onClick={() => katSil(katIdx)}
                    className="text-xs px-2 py-1 shrink-0"
                    style={{ color: "var(--ast-error-text)" }}
                  >
                    ✕ Sil
                  </button>
                </div>

                {/* Ürünler */}
                <div>
                  {kat.urunler.map((urun, urunIdx) => (
                    <div key={urunIdx} className="p-3"
                      style={{ borderBottom: "1px solid var(--ast-divider)" }}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <input
                            value={urun.isim}
                            onChange={(e) => urunGuncelle(katIdx, urunIdx, "isim", e.target.value)}
                            style={inputStyle}
                            placeholder="Ürün adı"
                          />
                          <input
                            value={urun.aciklama}
                            onChange={(e) => urunGuncelle(katIdx, urunIdx, "aciklama", e.target.value)}
                            style={{ ...inputStyle, color: "var(--ast-text2)" }}
                            placeholder="Açıklama (opsiyonel)"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={urun.fiyat}
                              onChange={(e) => urunGuncelle(katIdx, urunIdx, "fiyat", e.target.value)}
                              style={{ ...inputStyle, width: 96 }}
                              placeholder="Fiyat"
                            />
                            <span className="text-xs" style={{ color: "var(--ast-text3)" }}>₺</span>
                          </div>
                        </div>
                        <button
                          onClick={() => urunSil(katIdx, urunIdx)}
                          className="text-xs mt-1 px-1 shrink-0"
                          style={{ color: "var(--ast-error-text)" }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ürün ekle */}
                <button
                  onClick={() => urunEkle(katIdx)}
                  className="w-full text-xs py-2"
                  style={{ color: "var(--ast-gold)", borderTop: "1px solid var(--ast-divider)", background: "transparent" }}
                >
                  + Ürün Ekle
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid var(--ast-divider)" }}>
            <button
              onClick={() => { setAdim("bos"); setOnizleme([]); }}
              className="flex-1 py-3 rounded-xl text-sm"
              style={{ border: "1px solid var(--ast-divider)", color: "var(--ast-text2)", background: "var(--ast-badge-bg)" }}
            >
              İptal
            </button>
            <button
              onClick={onayla}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}
            >
              Onayla ve Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
