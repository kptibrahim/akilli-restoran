"use client";

import { PAKET_OZELLIKLERI } from "@/lib/paket-limitleri";

interface UpgradeModalProps {
  ozellik: string;
  hedefPaket: "baslangic" | "profesyonel" | "premium";
  mevcutPaket?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({
  ozellik,
  hedefPaket,
  mevcutPaket = "ucretsiz",
  isOpen,
  onClose,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const hedefIsim = PAKET_OZELLIKLERI[hedefPaket].isim;
  const mevcutIsim =
    (PAKET_OZELLIKLERI as Record<string, { isim: string }>)[mevcutPaket]?.isim ?? mevcutPaket;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--ast-card-bg)",
          border: "1px solid var(--ast-card-border)",
          borderRadius: 20,
          padding: 28,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Kilit ikonu */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: "0 auto 18px",
          background: "rgba(200,148,52,0.12)",
          border: "1px solid rgba(200,148,52,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
        }}>
          🔒
        </div>

        <h3 style={{
          color: "var(--ast-text1)", fontSize: 18, fontWeight: 700,
          textAlign: "center", marginBottom: 8,
        }}>
          Bu özellik {hedefIsim} paketinde
        </h3>

        <p style={{ color: "var(--ast-text2)", fontSize: 13, textAlign: "center", marginBottom: 6 }}>
          <strong style={{ color: "var(--ast-text1)" }}>{ozellik}</strong> özelliğini kullanmak için
          paketinizi yükseltin.
        </p>

        <p style={{ color: "var(--ast-text3)", fontSize: 12, textAlign: "center", marginBottom: 20 }}>
          Şu an: {mevcutIsim}
        </p>

        {/* Pilot dönem notu */}
        <div style={{
          background: "rgba(200,148,52,0.08)",
          border: "1px solid rgba(200,148,52,0.2)",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 20,
        }}>
          <p style={{ color: "var(--ast-text2)", fontSize: 12, lineHeight: 1.6, textAlign: "center" }}>
            🚀 Pilot dönem boyunca tüm kullanıcılarımız{" "}
            <strong style={{ color: "var(--ast-gold)" }}>Profesyonel AI</strong>{" "}
            paketine ücretsiz erişmektedir.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a
            href="/dashboard/abonelik"
            style={{
              background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C8832A 100%)",
              color: "#0A0705",
              border: "none",
              borderRadius: 12,
              padding: "12px 20px",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.04em",
              cursor: "pointer",
              textAlign: "center",
              textDecoration: "none",
              display: "block",
            }}
          >
            Paketleri Görüntüle →
          </a>
          <button
            onClick={onClose}
            style={{
              background: "var(--ast-input-bg)",
              color: "var(--ast-text2)",
              border: "1px solid var(--ast-card-border)",
              borderRadius: 12,
              padding: "12px 20px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
