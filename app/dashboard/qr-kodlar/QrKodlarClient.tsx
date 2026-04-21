"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const QRCodeCanvas = dynamic(() => import("qrcode.react").then((mod) => mod.QRCodeCanvas), { ssr: false });

type Masa = { id: string; isim: string };

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export default function QrKodlarClient({ slug, logo }: { slug: string; logo: string | null }) {
  const [masalar, setMasalar] = useState<Masa[]>([]);
  const [yeniIsim, setYeniIsim] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [customBase, setCustomBase] = useState("");
  const [editingBase, setEditingBase] = useState(false);
  const [panelAcik, setPanelAcik] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    try {
      const kayitli = localStorage.getItem("gastronom_masalar");
      if (kayitli) setMasalar(JSON.parse(kayitli));
      const savedBase = localStorage.getItem("gastronom_base_url");
      if (savedBase) setCustomBase(savedBase);
    } catch { localStorage.removeItem("gastronom_masalar"); }
    setReady(true);
  }, []);

  const activeBase = customBase || baseUrl;
  const anaKod = masalar[0] ?? null;
  const digerKodlar = masalar.slice(1);

  function baseUrlKaydet() {
    const val = customBase.trim().replace(/\/$/, "");
    setCustomBase(val);
    if (val) localStorage.setItem("gastronom_base_url", val);
    else localStorage.removeItem("gastronom_base_url");
    setEditingBase(false);
  }

  function kaydet(liste: Masa[]) {
    setMasalar(liste);
    localStorage.setItem("gastronom_masalar", JSON.stringify(liste));
  }

  function masaEkle() {
    const isim = yeniIsim.trim();
    if (!isim) return;
    kaydet([...masalar, { id: Date.now().toString(), isim }]);
    setYeniIsim("");
  }

  function masaSil(id: string) {
    const yeni = masalar.filter((m) => m.id !== id);
    kaydet(yeni);
    if (yeni.length <= 1) setPanelAcik(false);
  }

  function qrUrl(masa: Masa) {
    return `${activeBase}/${slug}?masa=${encodeURIComponent(masa.isim)}`;
  }

  function qrIndir(masa: Masa, canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${masa.isim.replace(/\s+/g, "-")}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

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

  const cardStyle = {
    background: "var(--ast-card-bg)",
    border: "1px solid var(--ast-card-border)",
    borderRadius: 16,
  };

  return (
    <div className="p-6 md:p-10 max-w-lg" style={{ paddingBottom: 100 }}>
      <div className="mb-7">
        <h1 className="text-2xl font-black" style={{ color: "var(--ast-text1)" }}>QR Kod Yöneticisi</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--ast-text2)" }}>Her masa için özel QR kod oluştur ve indir</p>
      </div>

      {/* Menü URL */}
      <div className="p-4 mb-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-sm" style={{ color: "var(--ast-text1)" }}>Menü Adresi (URL)</h2>
          <button onClick={() => setEditingBase(!editingBase)} className="text-xs font-semibold" style={{ color: "var(--ast-gold)" }}>
            {editingBase ? "İptal" : "Düzenle"}
          </button>
        </div>
        {editingBase ? (
          <div className="flex gap-2 mt-2">
            <input value={customBase} onChange={(e) => setCustomBase(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && baseUrlKaydet()}
              placeholder={baseUrl} style={inputStyle} />
            <button onClick={baseUrlKaydet} className="px-4 py-2 rounded-xl text-sm font-semibold shrink-0"
              style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
              Kaydet
            </button>
          </div>
        ) : (
          <p className="text-xs mt-1 break-all" style={{ color: "var(--ast-text3)" }}>{activeBase || "Yükleniyor..."}</p>
        )}
        {ready && !customBase && baseUrl.includes("localhost") && (
          <p className="text-xs mt-2" style={{ color: "var(--ast-warn-text)" }}>
            ⚠️ Şu an localhost kullanılıyor. Telefon erişimi için IP adresinizi girin.
          </p>
        )}
      </div>

      {/* Yeni Masa */}
      <div className="p-4 mb-6" style={cardStyle}>
        <h2 className="font-semibold text-sm mb-3" style={{ color: "var(--ast-text1)" }}>Yeni Masa / Alan Ekle</h2>
        <div className="flex gap-2">
          <input value={yeniIsim} onChange={(e) => setYeniIsim(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && masaEkle()}
            placeholder="Örn: Masa 1, Teras, VIP..."
            style={{ ...inputStyle, flex: 1 }} />
          <button onClick={masaEkle} className="px-5 py-2.5 rounded-xl text-sm font-semibold shrink-0"
            style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
            + Ekle
          </button>
        </div>
      </div>

      {/* Boş durum */}
      {masalar.length === 0 && (
        <div className="p-8 text-center text-sm" style={{ ...cardStyle, color: "var(--ast-text2)" }}>
          Henüz masa eklemediniz. Yukarıdan masa veya alan adı yazıp Ekle&apos;ye basın.
        </div>
      )}

      {/* Ana QR Kod + Panel Butonu */}
      {anaKod && ready && (
        <div className="flex items-stretch gap-3">
          {/* Ana QR Kartı */}
          <div style={{ ...cardStyle, flex: 1 }} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--ast-divider)" }}>
              <span className="font-bold" style={{ color: "var(--ast-text1)" }}>{anaKod.isim}</span>
              {masalar.length > 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text3)" }}>
                  +{digerKodlar.length} diğer
                </span>
              )}
            </div>
            <div className="flex flex-col items-center p-5 gap-3">
              <div className="p-3 rounded-xl" style={{ background: "#FFFFFF", border: "1px solid var(--ast-divider)" }}>
                <QRCodeCanvas id={`qr-main-${anaKod.id}`} value={qrUrl(anaKod)} size={160} marginSize={1}
                  {...(logo ? { imageSettings: { src: logo, width: 36, height: 36, excavate: true } } : {})} />
              </div>
              <p className="text-[10px] text-center break-all px-2" style={{ color: "var(--ast-text3)" }}>{qrUrl(anaKod)}</p>
              <div className="flex gap-2 w-full">
                <button onClick={() => masaSil(anaKod.id)}
                  className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ border: "1px solid var(--ast-error-border)", background: "var(--ast-error-bg)", color: "var(--ast-error-text)" }}>
                  <TrashIcon /> Kaldır
                </button>
                <button onClick={() => qrIndir(anaKod, `qr-main-${anaKod.id}`)}
                  className="flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
                  <DownloadIcon /> İndir
                </button>
              </div>
            </div>
          </div>

          {/* Panel Açma Butonu — sadece 2+ QR varsa göster */}
          {digerKodlar.length > 0 && (
            <button
              onClick={() => setPanelAcik(true)}
              className="flex flex-col items-center justify-center gap-2 px-3 rounded-2xl"
              style={{
                background: "var(--ast-card-bg)",
                border: "1px solid var(--ast-card-border)",
                color: "var(--ast-gold)",
                minWidth: 52,
                cursor: "pointer",
              }}
            >
              <GridIcon />
              <span className="text-[10px] font-black" style={{ color: "var(--ast-text1)", lineHeight: 1 }}>
                +{digerKodlar.length}
              </span>
              <ChevronRightIcon />
            </button>
          )}
        </div>
      )}

      {/* Sağ Panel (drawer) */}
      {panelAcik && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: "var(--ast-modal-overlay)" }}
            onClick={() => setPanelAcik(false)}
          />
          {/* Drawer */}
          <div
            className="fixed top-0 right-0 h-full z-50 flex flex-col"
            style={{
              width: 300,
              background: "var(--ast-card-bg)",
              borderLeft: "1px solid var(--ast-card-border)",
              overflowY: "auto",
            }}
          >
            {/* Panel başlık */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--ast-divider)" }}>
              <div>
                <p className="font-black text-sm" style={{ color: "var(--ast-text1)" }}>Diğer QR Kodlar</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--ast-text3)" }}>{digerKodlar.length} adet</p>
              </div>
              <button
                onClick={() => setPanelAcik(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-sm"
                style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text2)" }}>
                ✕
              </button>
            </div>

            {/* QR listesi */}
            <div className="flex flex-col gap-3 p-4">
              {digerKodlar.map((masa) => (
                <div key={masa.id} className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: "var(--ast-icon-bg)", border: "1px solid var(--ast-divider)" }}>
                  {/* Küçük QR */}
                  <div className="shrink-0 p-1.5 rounded-xl" style={{ background: "#FFFFFF" }}>
                    <QRCodeCanvas id={`qr-panel-${masa.id}`} value={qrUrl(masa)} size={64} marginSize={1}
                      {...(logo ? { imageSettings: { src: logo, width: 16, height: 16, excavate: true } } : {})} />
                  </div>
                  {/* İsim + butonlar */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--ast-text1)" }}>{masa.isim}</p>
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => qrIndir(masa, `qr-panel-${masa.id}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                        style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
                        <DownloadIcon /> İndir
                      </button>
                      <button
                        onClick={() => masaSil(masa.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                        style={{ background: "var(--ast-error-bg)", border: "1px solid var(--ast-error-border)", color: "var(--ast-error-text)" }}>
                        <TrashIcon /> Kaldır
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
