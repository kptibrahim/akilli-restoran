"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import DashboardNav from "./DashboardNav";

export type Rol = "yonetici" | "kasiyer" | "mutfak";

const SESSION_KEY = "gastronom_rol";

const ROL_IZINLERI: Record<Rol, string[]> = {
  yonetici: [],
  kasiyer: ["/dashboard/siparisler", "/dashboard/kasa"],
  mutfak: ["/dashboard/siparisler"],
};

function izinliMi(rol: Rol, path: string): boolean {
  if (rol === "yonetici") return true;
  return ROL_IZINLERI[rol].some((p) => path === p || path.startsWith(p + "/"));
}

function varsayilanSayfa(rol: Rol): string {
  return rol === "yonetici" ? "/dashboard" : "/dashboard/siparisler";
}

// ── PIN Numpad ──────────────────────────────────────────────────────────────

function PinNumpad({
  onTamamla,
  onIptal,
  yanlis,
}: {
  onTamamla: (pin: string) => void;
  onIptal: () => void;
  yanlis: boolean;
}) {
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (pin.length === 6) {
      onTamamla(pin);
      setTimeout(() => setPin(""), 400);
    }
  }, [pin, onTamamla]);

  function tus(n: string) {
    setPin((p) => (p.length < 6 ? p + n : p));
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Nokta göstergesi */}
      <div className="flex gap-3 h-8 items-center">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-150"
            style={{
              width: i < pin.length ? 15 : 11,
              height: i < pin.length ? 15 : 11,
              background: i < pin.length ? "var(--ast-gold)" : "var(--ast-divider)",
            }}
          />
        ))}
      </div>

      {yanlis && (
        <p className="text-xs font-semibold -mt-2" style={{ color: "var(--ast-error-text)" }}>
          Yanlış PIN, tekrar dene
        </p>
      )}

      {/* Tuş takımı */}
      <div className="grid grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <button
            key={n}
            onClick={() => tus(n)}
            className="w-[72px] h-[72px] rounded-2xl text-xl font-bold transition-all active:scale-95"
            style={{
              background: "var(--ast-card-bg)",
              border: "1px solid var(--ast-card-border)",
              color: "var(--ast-text1)",
            }}
          >
            {n}
          </button>
        ))}
        <button
          onClick={onIptal}
          className="w-[72px] h-[72px] rounded-2xl text-xs font-semibold transition-all active:scale-95"
          style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text3)" }}
        >
          Geri
        </button>
        <button
          onClick={() => tus("0")}
          className="w-[72px] h-[72px] rounded-2xl text-xl font-bold transition-all active:scale-95"
          style={{
            background: "var(--ast-card-bg)",
            border: "1px solid var(--ast-card-border)",
            color: "var(--ast-text1)",
          }}
        >
          0
        </button>
        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="w-[72px] h-[72px] rounded-2xl text-xl transition-all active:scale-95"
          style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text2)" }}
        >
          ⌫
        </button>
      </div>
    </div>
  );
}

// ── Rol Seçim Ekranı ────────────────────────────────────────────────────────

function RolSecimEkrani({
  pinYonetici,
  pinKasiyer,
  pinMutfak,
  onRolSec,
}: {
  pinYonetici: string | null;
  pinKasiyer: string | null;
  pinMutfak: string | null;
  onRolSec: (rol: Rol) => void;
}) {
  const [adim, setAdim] = useState<"secim" | "pin">("secim");
  const [secilenRol, setSecilenRol] = useState<Rol | null>(null);
  const [yanlis, setYanlis] = useState(false);

  function rolTus(rol: Rol) {
    setSecilenRol(rol);
    setYanlis(false);
    setAdim("pin");
  }

  const pinDogrula = useCallback(
    (girilenPin: string) => {
      let dogru: string | null = null;
      if (secilenRol === "yonetici") dogru = pinYonetici;
      else if (secilenRol === "kasiyer") dogru = pinKasiyer;
      else if (secilenRol === "mutfak") dogru = pinMutfak;
      if (girilenPin === dogru) {
        onRolSec(secilenRol!);
      } else {
        setYanlis(true);
      }
    },
    [secilenRol, pinYonetici, pinKasiyer, pinMutfak, onRolSec]
  );

  const ROL_BASLIK: Record<Rol, string> = {
    yonetici: "Yönetici",
    kasiyer: "Kasiyer",
    mutfak: "Mutfak",
  };

  const secenekler = [
    {
      rol: "yonetici" as const,
      icon: "👑",
      baslik: "Yönetici",
      aciklama: pinYonetici ? "Tam erişim · PIN ile giriş" : "PIN henüz ayarlanmadı · Doğrudan giriş",
      aktif: true,
      pinGerekli: !!pinYonetici,
    },
    {
      rol: "kasiyer" as const,
      icon: "💰",
      baslik: "Kasiyer",
      aciklama: pinKasiyer ? "Siparişler & Kasa" : "PIN henüz ayarlanmadı",
      aktif: !!pinKasiyer,
      pinGerekli: true,
    },
    {
      rol: "mutfak" as const,
      icon: "👨‍🍳",
      baslik: "Mutfak",
      aciklama: pinMutfak ? "Sadece Siparişler" : "PIN henüz ayarlanmadı",
      aktif: !!pinMutfak,
      pinGerekli: true,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "var(--ast-bg, #141210)" }}
    >
      <div className="w-full max-w-xs">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            style={{
              width: 52, height: 52,
              background: "linear-gradient(135deg, #C89434 0%, #E8B84B 50%, #C8832A 100%)",
              borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 24px rgba(200,148,52,0.35)",
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 900, color: "#0A0705", lineHeight: 1 }}>G</span>
          </div>
          <p className="font-black text-lg" style={{ color: "var(--ast-text1)", letterSpacing: "0.08em" }}>
            GASTRONOM <span style={{ color: "var(--ast-gold)" }}>AI</span>
          </p>
          <p className="text-sm mt-1.5" style={{ color: "var(--ast-text3)" }}>
            {adim === "secim" ? "Kim olduğunuzu seçin" : `${ROL_BASLIK[secilenRol!]} PIN girişi`}
          </p>
        </div>

        {adim === "secim" ? (
          <div className="flex flex-col gap-3">
            {secenekler.map(({ rol, icon, baslik, aciklama, aktif, pinGerekli }) => (
              <button
                key={rol}
                onClick={() => {
                  if (!aktif) return;
                  if (pinGerekli) rolTus(rol);
                  else onRolSec(rol);
                }}
                disabled={!aktif}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98] disabled:opacity-35"
                style={{
                  background: "var(--ast-card-bg)",
                  border: "1px solid var(--ast-card-border)",
                }}
              >
                <span className="text-2xl shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: "var(--ast-text1)" }}>{baslik}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--ast-text3)" }}>{aciklama}</p>
                </div>
                {aktif && pinGerekli && (
                  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2}
                    className="shrink-0" style={{ color: "var(--ast-gold)" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                )}
                {(!pinGerekli || !aktif) && (
                  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2}
                    className="shrink-0" style={{ color: "var(--ast-text3)" }}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        ) : (
          <PinNumpad
            onTamamla={pinDogrula}
            onIptal={() => { setAdim("secim"); setYanlis(false); }}
            yanlis={yanlis}
          />
        )}
      </div>
    </div>
  );
}

// ── Ana DashboardShell ───────────────────────────────────────────────────────

export default function DashboardShell({
  children,
  userEmail,
  restoran,
  pinYonetici,
  pinKasiyer,
  pinMutfak,
}: {
  children: React.ReactNode;
  userEmail: string;
  restoran: { id: string; isim: string; slug: string; renk: string; logo: string | null } | null;
  pinYonetici: string | null;
  pinKasiyer: string | null;
  pinMutfak: string | null;
}) {
  const [rol, setRol] = useState<Rol | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const kayitli = sessionStorage.getItem(SESSION_KEY) as Rol | null;
    setRol(kayitli);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !rol) return;
    if (!izinliMi(rol, pathname)) {
      router.replace(varsayilanSayfa(rol));
    }
  }, [ready, rol, pathname, router]);

  function rolSec(secilenRol: Rol) {
    sessionStorage.setItem(SESSION_KEY, secilenRol);
    setRol(secilenRol);
    if (!izinliMi(secilenRol, pathname)) {
      router.replace(varsayilanSayfa(secilenRol));
    }
  }

  function rolTemizle() {
    sessionStorage.removeItem(SESSION_KEY);
    setRol(null);
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ast-bg, #141210)" }}>
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--ast-gold)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!rol) {
    return (
      <RolSecimEkrani
        pinYonetici={pinYonetici}
        pinKasiyer={pinKasiyer}
        pinMutfak={pinMutfak}
        onRolSec={rolSec}
      />
    );
  }

  return (
    <div className="dash-shell">
      <DashboardNav
        userEmail={userEmail}
        restoran={restoran}
        restoranId={restoran?.id}
        restoranLogo={restoran?.logo ?? null}
        rol={rol}
        onRolDegistir={rolTemizle}
      />
      <main className="dash-content">{children}</main>
    </div>
  );
}
