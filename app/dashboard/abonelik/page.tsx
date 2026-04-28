import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/supabase-admin";
import { PAKET_OZELLIKLERI } from "@/lib/paket-limitleri";

function buAy(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function tarihFormat(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default async function AbonelikPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: restoran } = await adminDb
    .from("Restoran")
    .select("id, isim")
    .eq("userId", user.id)
    .single();

  if (!restoran) redirect("/dashboard");

  const [{ data: abonelik }, { data: kullanim }] = await Promise.all([
    adminDb
      .from("Abonelik")
      .select("paket, durum, baslangicTarih, bitisTarih, notlar")
      .eq("restoranId", restoran.id)
      .single(),
    adminDb
      .from("AiKullanim")
      .select("chatbotMesaj, ceviriCagri, menuImport")
      .eq("restoranId", restoran.id)
      .eq("ay", buAy())
      .single(),
  ]);

  const paket = (abonelik?.paket ?? "profesyonel") as keyof typeof PAKET_OZELLIKLERI;
  const ozellikler = PAKET_OZELLIKLERI[paket] ?? PAKET_OZELLIKLERI.profesyonel;

  const chatbotKullanilan = (kullanim as { chatbotMesaj?: number } | null)?.chatbotMesaj ?? 0;
  const ceviriKullanilan  = (kullanim as { ceviriCagri?: number }  | null)?.ceviriCagri  ?? 0;
  const importKullanilan  = (kullanim as { menuImport?: number }   | null)?.menuImport   ?? 0;

  const chatbotLimit = ozellikler.chatbotMesajAylik;

  const cardStyle: React.CSSProperties = {
    background: "var(--ast-card-bg)",
    border: "1px solid var(--ast-card-border)",
    borderRadius: 16,
    boxShadow: "var(--ast-card-shadow)",
  };

  const paketler = [
    { key: "ucretsiz",    isim: "Ücretsiz",       fiyat: "₺0",           icon: "🆓" },
    { key: "baslangic",   isim: "Başlangıç",       fiyat: "₺499/ay",      icon: "🌱" },
    { key: "profesyonel", isim: "Profesyonel AI",  fiyat: "₺1.499/ay",    icon: "🚀" },
    { key: "premium",     isim: "Premium AI",      fiyat: "₺2.999/ay",    icon: "💎" },
  ] as const;

  return (
    <div className="p-6 md:p-10 max-w-2xl" style={{ paddingBottom: 80 }}>

      {/* Başlık */}
      <div className="mb-8">
        <h1 style={{ color: "var(--ast-text1)", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
          Abonelik
        </h1>
        <p style={{ color: "var(--ast-text2)", fontSize: 14 }}>
          Paket bilgileriniz ve bu ayki kullanım durumu.
        </p>
      </div>

      {/* Mevcut paket kartı */}
      <div style={{ ...cardStyle, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, #C89434, #E8B84B)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>🚀</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h2 style={{ color: "var(--ast-text1)", fontSize: 18, fontWeight: 700 }}>
                {ozellikler.isim}
              </h2>
              <span style={{
                background: "rgba(34,197,94,0.15)",
                color: "#4ade80",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
              }}>
                {abonelik?.durum === "aktif" ? "Aktif" : abonelik?.durum ?? "Aktif"}
              </span>
            </div>
            <p style={{ color: "var(--ast-text2)", fontSize: 12, marginBottom: 2 }}>
              Başlangıç: {tarihFormat(abonelik?.baslangicTarih ?? null)}
            </p>
            {abonelik?.notlar && (
              <p style={{ color: "var(--ast-gold)", fontSize: 12, fontWeight: 600 }}>
                📌 {abonelik.notlar}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bu ay kullanım */}
      <div style={{ ...cardStyle, padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: "var(--ast-text1)", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          Bu Ay Kullanım
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* AI Chatbot */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "var(--ast-text2)", fontSize: 13 }}>💬 AI Chatbot</span>
              <span style={{ color: "var(--ast-text1)", fontSize: 13, fontWeight: 600 }}>
                {chatbotKullanilan.toLocaleString("tr-TR")}
                {chatbotLimit !== -1 ? ` / ${chatbotLimit.toLocaleString("tr-TR")} mesaj` : " mesaj (sınırsız)"}
              </span>
            </div>
            {chatbotLimit !== -1 && chatbotLimit > 0 && (
              <div style={{ height: 6, background: "var(--ast-input-bg)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min((chatbotKullanilan / chatbotLimit) * 100, 100)}%`,
                  background: chatbotKullanilan / chatbotLimit > 0.8
                    ? "linear-gradient(90deg, #ef4444, #f87171)"
                    : "linear-gradient(90deg, #C89434, #E8B84B)",
                  borderRadius: 3,
                  transition: "width 0.3s",
                }} />
              </div>
            )}
          </div>

          {/* AI Çeviri */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ast-text2)", fontSize: 13 }}>🌍 AI Çeviri</span>
            <span style={{ color: "var(--ast-text1)", fontSize: 13, fontWeight: 600 }}>
              {ceviriKullanilan.toLocaleString("tr-TR")} işlem
            </span>
          </div>

          {/* AI Menü Import */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ast-text2)", fontSize: 13 }}>📸 AI Menü Import</span>
            <span style={{ color: "var(--ast-text1)", fontSize: 13, fontWeight: 600 }}>
              {importKullanilan} işlem
            </span>
          </div>
        </div>
      </div>

      {/* Paket kartları */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: "var(--ast-text1)", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
          Paketler
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {paketler.map((p) => {
            const aktif = p.key === paket;
            return (
              <div
                key={p.key}
                style={{
                  background: aktif
                    ? "linear-gradient(135deg, rgba(200,148,52,0.12), rgba(200,148,52,0.06))"
                    : "var(--ast-card-bg)",
                  border: aktif ? "1.5px solid rgba(200,148,52,0.4)" : "1px solid var(--ast-card-border)",
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>{p.icon}</div>
                <div style={{ color: "var(--ast-text1)", fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                  {p.isim}
                </div>
                <div style={{ color: aktif ? "var(--ast-gold)" : "var(--ast-text3)", fontSize: 12, marginBottom: 10 }}>
                  {aktif ? "Mevcut paket" : p.fiyat}
                </div>
                {aktif ? (
                  <div style={{
                    background: "rgba(200,148,52,0.15)",
                    color: "var(--ast-gold)",
                    border: "1px solid rgba(200,148,52,0.3)",
                    borderRadius: 8, padding: "6px 10px",
                    fontSize: 11, fontWeight: 700, textAlign: "center",
                  }}>
                    ✓ Aktif
                  </div>
                ) : (
                  <div
                    title="Pilot dönem boyunca tüm restoranlarımız Profesyonel AI paketindedir. Ödeme sistemimiz hazırlandığında size haber vereceğiz."
                    style={{
                      background: "var(--ast-input-bg)",
                      color: "var(--ast-text3)",
                      border: "1px solid var(--ast-card-border)",
                      borderRadius: 8, padding: "6px 10px",
                      fontSize: 11, fontWeight: 600, textAlign: "center",
                      cursor: "not-allowed",
                    }}
                  >
                    Yakında
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pilot programı notu */}
      <div style={{
        background: "rgba(200,148,52,0.06)",
        border: "1px solid rgba(200,148,52,0.2)",
        borderRadius: 14,
        padding: "16px 20px",
      }}>
        <p style={{ color: "var(--ast-text1)", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          ℹ️ Pilot Programı
        </p>
        <p style={{ color: "var(--ast-text2)", fontSize: 13, lineHeight: 1.7 }}>
          Şu an erken erişim dönemindeyiz. Tüm pilotlarımıza ücretsiz{" "}
          <strong style={{ color: "var(--ast-gold)" }}>Profesyonel AI</strong> erişimi sunuyoruz.
          Geri bildirimleriniz çok değerli, lütfen bizimle paylaşın!
        </p>
      </div>

    </div>
  );
}
