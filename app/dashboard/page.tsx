import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, color: "var(--ast-icon-color)" }}>
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function OrderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, color: "var(--ast-icon-color)" }}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
function AnalyticsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, color: "var(--ast-icon-color)" }}>
      <path d="M3 20l4-8 4 4 4-6 4 4" />
      <path d="M3 4v16h18" />
    </svg>
  );
}
function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26, color: "var(--ast-icon-color)" }}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h2m0 0h3m-3 0v3m0 0v3m0-3h3m0-3v3" />
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase
    .from("Restoran").select("id, isim, slug, renk").eq("userId", user.id).single();

  const { count: siparisSayisi } = await supabase
    .from("Siparis").select("*", { count: "exact", head: true })
    .eq("restoranId", restoran?.id ?? "").eq("durum", "bekliyor");

  const bekleyen = siparisSayisi ?? 0;

  const kartlar = [
    { href: "/dashboard/menu-editor", Icon: MenuIcon, baslik: "Menü Editörü", aciklama: "Kategori ve ürünlerinizi yönetin." },
    { href: "/dashboard/siparisler", Icon: OrderIcon, baslik: "Siparişler", aciklama: bekleyen > 0 ? `${bekleyen} bekleyen siparişiniz var.` : "0 bekleyen siparişiniz var.", vurgu: bekleyen > 0 },
    { href: "/dashboard/analitik", Icon: AnalyticsIcon, baslik: "Analitik", aciklama: "İstatistikler ve AI-destekli raporlar." },
    { href: "/dashboard/ayarlar", Icon: QrIcon, baslik: "Ayarlar & QR", aciklama: "Restoran bilgileri ve masa QR kodları." },
  ];

  return (
    <div className="p-6 md:p-10 max-w-3xl">

      {/* Başlık */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="h-5 px-2.5 rounded-full flex items-center"
            style={{
              background: "rgba(200,148,52,0.12)",
              border: "1px solid rgba(200,148,52,0.25)",
            }}
          >
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--ast-gold)" }}>
              Yönetim Paneli
            </span>
          </div>
        </div>
        <h1
          className="text-3xl md:text-4xl font-black leading-tight"
          style={{ color: "var(--ast-text1)" }}
        >
          Hoş Geldiniz,{" "}
          <span style={{ color: "var(--ast-gold)" }}>{restoran?.isim ?? "Restoran"}</span>
        </h1>
        {restoran && (
          <a
            href={`/${restoran.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs mt-3 font-semibold px-3 py-1.5 rounded-xl"
            style={{
              color: "var(--ast-gold)",
              background: "rgba(200,148,52,0.08)",
              border: "1px solid rgba(200,148,52,0.2)",
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ width: 11, height: 11 }}>
              <path d="M8 2h6v6M6 10L14 2M2 6v8h8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Müşteri sayfasını görüntüle
          </a>
        )}
      </div>

      {/* Restoran yok uyarısı */}
      {!restoran && (
        <div className="mb-6 p-4 rounded-2xl" style={{ background: "var(--ast-warn-bg)", border: "1px solid var(--ast-warn-border)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--ast-warn-text)" }}>Henüz restoran kaydınız yok.</p>
          <a href="/dashboard/ayarlar" className="text-sm underline mt-1 block" style={{ color: "var(--ast-gold)" }}>Şimdi oluşturun →</a>
        </div>
      )}

      {/* Sipariş uyarısı */}
      {bekleyen > 0 && (
        <a
          href="/dashboard/siparisler"
          className="flex items-center gap-4 mb-7 p-4 rounded-2xl transition-all active:scale-[0.99]"
          style={{
            background: "linear-gradient(135deg, rgba(200,148,52,0.12) 0%, rgba(200,148,52,0.06) 100%)",
            border: "1.5px solid rgba(200,148,52,0.3)",
            boxShadow: "0 4px 20px rgba(200,148,52,0.1)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
            style={{ background: "rgba(200,148,52,0.15)", border: "1px solid rgba(200,148,52,0.25)" }}
          >
            🔔
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm" style={{ color: "var(--ast-gold)", fontFamily: "inherit" }}>
              {bekleyen} yeni sipariş var!
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--ast-text3)" }}>Hemen görüntüle →</p>
          </div>
        </a>
      )}

      {/* Kartlar */}
      <div className="grid grid-cols-2 gap-4">
        {kartlar.map(({ href, Icon, baslik, aciklama, vurgu }) => (
          <a
            key={href}
            href={href}
            className="rounded-2xl p-5 flex flex-col gap-4 transition-all active:scale-[0.97] hover:scale-[1.01]"
            style={{
              background: vurgu
                ? "linear-gradient(135deg, rgba(200,148,52,0.1) 0%, rgba(200,148,52,0.05) 100%)"
                : "var(--ast-card-bg)",
              border: `1px solid ${vurgu ? "rgba(200,148,52,0.3)" : "var(--ast-card-border)"}`,
              boxShadow: vurgu
                ? "0 4px 20px rgba(200,148,52,0.1)"
                : "0 2px 12px rgba(0,0,0,0.2)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: vurgu
                  ? "rgba(200,148,52,0.15)"
                  : "var(--ast-icon-bg)",
                border: `1px solid ${vurgu ? "rgba(200,148,52,0.3)" : "transparent"}`,
              }}
            >
              <Icon />
            </div>
            <div>
              <h2
                className="font-black text-base leading-tight"
                style={{ color: "var(--ast-text1)", fontFamily: "inherit" }}
              >
                {baslik}
              </h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: vurgu ? "var(--ast-warn-text)" : "var(--ast-text2)" }}>
                {aciklama}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Branding */}
      <div className="mt-10 flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px]"
          style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705", fontFamily: "inherit" }}
        >
          G
        </div>
        <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: "var(--ast-text3)" }}>
          Gastronom AI Panel
        </span>
      </div>
    </div>
  );
}
