"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useTheme } from "@/components/ThemeProvider";

type Restoran = { id: string; isim: string; slug: string; renk: string } | null;
type GarsonCagri = { id: string; masaNo: string; durum: "bekliyor" | "geliyor"; tip: "garson" | "hesap"; olusturuldu: string };

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="M3 12l9-9 9 9M5 10v10h5v-5h4v5h5V10" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function OrderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h2m0 0h3m-3 0v3m0 0v3m0-3h3m0-3v3" strokeLinecap="round" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

const LINKLER = [
  { href: "/dashboard", label: "Ana Sayfa", Icon: HomeIcon },
  { href: "/dashboard/menu-editor", label: "Menü", Icon: MenuIcon },
  { href: "/dashboard/siparisler", label: "Siparişler", Icon: OrderIcon },
  { href: "/dashboard/qr-kodlar", label: "QR Kodlar", Icon: QrIcon },
  { href: "/dashboard/ayarlar", label: "Ayarlar", Icon: GearIcon },
];

export default function DashboardNav({
  userEmail,
  restoran,
  restoranId,
  restoranLogo,
}: {
  userEmail: string;
  restoran: Restoran;
  restoranId?: string;
  restoranLogo?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";

  const [cagrilar, setCagrilar] = useState<GarsonCagri[]>([]);
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);

  useEffect(() => {
    if (!restoranId) return;
    async function yukle() {
      const { data } = await supabase
        .from("GarsonCagri")
        .select("id, masaNo, durum, tip, olusturuldu")
        .eq("restoranId", restoranId)
        .eq("durum", "bekliyor")
        .order("olusturuldu", { ascending: true });
      setCagrilar((data as GarsonCagri[]) ?? []);
    }
    yukle();
    const kanal = supabase.channel(`nav-garson-${restoranId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "GarsonCagri" }, () => yukle())
      .subscribe();
    const poller = setInterval(yukle, 4000);
    return () => {
      supabase.removeChannel(kanal);
      clearInterval(poller);
    };
  }, [restoranId]);

  async function onayla(id: string) {
    setYukleniyor(id);
    const res = await fetch("/api/garson-onayla", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) {
      setCagrilar(prev => prev.filter(c => c.id !== id));
    }
    setYukleniyor(null);
  }

  async function cikisYap() {
    await supabase.auth.signOut();
    router.push("/auth/giris");
    router.refresh();
  }

  function aktifMi(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ── MASAÜSTÜ SOL SİDEBAR ── */}
      <aside className="dash-sidebar">

        {/* Logo */}
        <div
          className="flex items-center gap-3 px-5 pt-6 pb-5"
          style={{
            borderBottom: "1px solid var(--ast-divider)",
            background: "linear-gradient(180deg, rgba(200,148,52,0.06) 0%, transparent 100%)",
          }}
        >
          <div className="shrink-0 relative" style={{ width: 36, height: 36 }}>
            <div
              style={{
                width: 36, height: 36,
                background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C8832A 100%)",
                borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(200,148,52,0.35)",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, color: "#0A0705", fontFamily: "inherit", lineHeight: 1 }}>G</span>
            </div>
          </div>
          <div>
            <p
              className="font-black text-sm leading-tight"
              style={{ color: "var(--ast-text1)", letterSpacing: "0.08em", fontFamily: "inherit" }}
            >
              GASTRONOM <span style={{ color: "var(--ast-gold)" }}>AI</span>
            </p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--ast-text3)", letterSpacing: "0.15em" }}>
              PANEL
            </p>
          </div>
        </div>

        {/* Restoran Adı */}
        <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: "1px solid var(--ast-divider)" }}>
          {restoranLogo ? (
            <img src={restoranLogo} alt="logo" className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
              style={{ backgroundColor: restoran?.renk ?? "#C89434" }}>
              {(restoran?.isim ?? userEmail)[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold truncate" style={{ color: "var(--ast-text2)" }}>
            {restoran?.isim ?? userEmail}
          </span>
        </div>

        {/* Navigasyon */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {LINKLER.map(({ href, label, Icon }) => {
            const aktif = aktifMi(href);
            return (
              <a
                key={href}
                href={href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={aktif ? {
                  background: "var(--ast-nav-active-bg)",
                  color: "var(--ast-nav-active-color)",
                  borderLeft: "3px solid var(--ast-nav-active-border)",
                } : {
                  color: "var(--ast-nav-inactive)",
                }}
              >
                <span style={aktif ? { color: "var(--ast-nav-active-color)" } : { color: "var(--ast-nav-inactive)" }}>
                  <Icon />
                </span>
                {label}
              </a>
            );
          })}
        </nav>

        {/* Bekleyen Çağrılar */}
        {cagrilar.length > 0 && (
          <div className="px-3 pb-2 flex flex-col gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest px-1 mb-0.5" style={{ color: "var(--ast-text3)" }}>
              Bekleyen · {cagrilar.length}
            </p>
            {cagrilar.map((c) => {
              const hesap = c.tip === "hesap";
              return (
                <div key={c.id} className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                  style={{ background: "var(--ast-warn-bg)", border: "1px solid var(--ast-warn-border)" }}>
                  <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: "var(--ast-gold)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-none truncate" style={{ color: "var(--ast-text1)" }}>Masa {c.masaNo}</p>
                    <p className="text-[10px] leading-none mt-0.5 truncate" style={{ color: "var(--ast-warn-text)" }}>
                      {hesap ? "hesap istiyor" : "garson talep ediyor"}
                    </p>
                  </div>
                  <button onClick={() => onayla(c.id)} disabled={yukleniyor === c.id}
                    className="shrink-0 h-7 px-2.5 rounded-lg text-[10px] font-bold disabled:opacity-40"
                    style={{ background: "var(--ast-gold)", color: isLight ? "#FFFFFF" : "#0A0705" }}>
                    {yukleniyor === c.id ? "..." : "Tamam"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Alt — Kullanıcı Paneli + Çıkış */}
        <div className="px-3 py-4 flex flex-col gap-0.5" style={{ borderTop: "1px solid var(--ast-divider)" }}>
          {restoran && (
            <a href={`/${restoran.slug}`} target="_blank"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors"
              style={{ color: "var(--ast-text3)" }}>
              <UserIcon />
              <span>Kullanıcı Paneli</span>
            </a>
          )}
          <button onClick={cikisYap}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-left transition-colors"
            style={{ color: "var(--ast-text3)" }}>
            <LogoutIcon />
            <span>Çıkış Yap</span>
          </button>
        </div>

        {/* Tema Toggle */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--ast-divider)" }}>
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--ast-divider)" }}>
            <button
              onClick={() => setTheme("light")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
              style={!isLight ? {
                background: "var(--ast-card-bg)",
                color: "var(--ast-text3)",
              } : {
                background: "var(--ast-gold)",
                color: "#FFFFFF",
              }}
            >
              <SunIcon />
              Aydınlık
            </button>
            <button
              onClick={() => setTheme("dark")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
              style={isLight ? {
                background: "var(--ast-card-bg)",
                color: "var(--ast-text3)",
              } : {
                background: "#1C1710",
                color: "#C89434",
                border: "1px solid rgba(200,148,52,0.3)",
              }}
            >
              <MoonIcon />
              Karanlık
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBİL: Üst Başlık ── */}
      <header className="dash-mobile sticky top-0 z-20" style={{ background: "var(--ast-sidebar-bg)", borderBottom: "1px solid var(--ast-divider)" }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div
              style={{
                width: 30, height: 30,
                background: "linear-gradient(135deg, #C89434, #E8B84B)",
                borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 10px rgba(200,148,52,0.3)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 900, color: "#0A0705", fontFamily: "inherit", lineHeight: 1 }}>G</span>
            </div>
            <div>
              <p
                className="font-black text-sm leading-none"
                style={{ color: "var(--ast-text1)", fontFamily: "inherit", letterSpacing: "0.06em" }}
              >
                GASTRONOM <span style={{ color: "var(--ast-gold)" }}>AI</span>
              </p>
              {restoran && <p className="text-[10px] leading-none mt-0.5" style={{ color: "var(--ast-text3)" }}>{restoran.isim}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobil tema toggle */}
            <button
              onClick={() => setTheme(isLight ? "dark" : "light")}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--ast-icon-bg)", color: "var(--ast-gold)" }}
            >
              {isLight ? <MoonIcon /> : <SunIcon />}
            </button>
            {restoran && (
              <a href={`/${restoran.slug}`} target="_blank"
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: "var(--ast-icon-bg)", color: "var(--ast-gold)", border: "1px solid var(--ast-divider)" }}>
                Menü
              </a>
            )}
            <button onClick={cikisYap} className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text3)", border: "1px solid var(--ast-divider)" }}>
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBİL: Bekleyen Çağrılar ── */}
      {cagrilar.length > 0 && (
        <div className="dash-mobile fixed left-0 right-0 z-20 px-3 pb-2 flex flex-col gap-1.5"
          style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}>
          {cagrilar.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl px-4 shadow-lg"
              style={{ height: 52, background: "var(--ast-warn-bg)", border: "1.5px solid var(--ast-warn-border)" }}>
              <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: "var(--ast-gold)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black leading-none truncate" style={{ color: "var(--ast-text1)" }}>Masa {c.masaNo}</p>
                <p className="text-[11px] leading-none mt-0.5 truncate" style={{ color: "var(--ast-warn-text)" }}>
                  {c.tip === "hesap" ? "hesap istiyor" : "garson talep ediyor"}
                </p>
              </div>
              <button onClick={() => onayla(c.id)} disabled={yukleniyor === c.id}
                className="shrink-0 h-8 px-4 rounded-xl text-xs font-bold disabled:opacity-40"
                style={{ background: "var(--ast-gold)", color: isLight ? "#FFFFFF" : "#0A0705" }}>
                {yukleniyor === c.id ? "..." : "Tamam"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── MOBİL: Alt Tab Bar ── */}
      <nav className="dash-mobile fixed bottom-0 left-0 right-0 z-20 flex"
        style={{ background: "var(--ast-sidebar-bg)", borderTop: "1px solid var(--ast-divider)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {LINKLER.map(({ href, label, Icon }) => {
          const aktif = aktifMi(href);
          return (
            <a key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5"
              style={{ color: aktif ? "var(--ast-nav-active-color)" : "var(--ast-text3)" }}>
              <Icon />
              <span className="text-[10px] font-semibold">{label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
