import { createClient } from "@/lib/supabase-server";
import { adminDb } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { PAKET_LIMITLER } from "@/lib/ai-kullanim";

function buAy(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function ProgressBar({ value, max, renk = "#C89434" }: { value: number; max: number; renk?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const uyari = pct >= 95 ? "#ef4444" : pct >= 80 ? "#f97316" : renk;
  return (
    <div className="w-full bg-white/8 rounded-full h-2 mt-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: uyari }}
      />
    </div>
  );
}

function KullanımKart({
  baslik,
  kullanildi,
  limit,
  alt,
}: {
  baslik: string;
  kullanildi: number;
  limit: number;
  alt: string;
}) {
  const pct = limit > 0 ? Math.min((kullanildi / limit) * 100, 100) : 0;
  const uyari = pct >= 95 ? "text-red-400" : pct >= 80 ? "text-orange-400" : "text-white/40";

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
      <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">{baslik}</p>
      {limit === 0 ? (
        <p className="text-white/30 text-sm">Bu pakette mevcut değil</p>
      ) : (
        <>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-3xl text-white">
              {kullanildi.toLocaleString("tr-TR")}
            </span>
            <span className="text-white/40 text-sm">/ {limit.toLocaleString("tr-TR")}</span>
          </div>
          <ProgressBar value={kullanildi} max={limit} />
          <p className={`text-xs mt-2 ${uyari}`}>
            {pct >= 95
              ? "⚠️ Limit dolmak üzere — paketi yükseltin"
              : pct >= 80
              ? "⚠️ %80 kullanıldı"
              : alt}
          </p>
        </>
      )}
    </div>
  );
}

export default async function KullanımPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase
    .from("Restoran")
    .select("id, isim, paket")
    .eq("userId", user.id)
    .single();

  if (!restoran) redirect("/dashboard");

  const paket = ((restoran as { paket?: string }).paket ?? "profesyonel") as keyof typeof PAKET_LIMITLER;
  const limitler = PAKET_LIMITLER[paket] ?? PAKET_LIMITLER.profesyonel;
  const ay = buAy();

  const { data: kullanim } = await adminDb
    .from("AiKullanim")
    .select("chatbotMesaj, ceviriCagri, menuImport, toplamInputToken, toplamOutputToken, toplamCacheRead, toplamCacheCreate, toplamMaliyet")
    .eq("restoranId", restoran.id)
    .eq("ay", ay)
    .single();

  type KullanımRow = {
    chatbotMesaj: number;
    ceviriCagri: number;
    menuImport: number;
    toplamInputToken: number;
    toplamOutputToken: number;
    toplamCacheRead: number;
    toplamCacheCreate: number;
    toplamMaliyet: number;
  };

  const k: KullanımRow = {
    chatbotMesaj: 0,
    ceviriCagri: 0,
    menuImport: 0,
    toplamInputToken: 0,
    toplamOutputToken: 0,
    toplamCacheRead: 0,
    toplamCacheCreate: 0,
    toplamMaliyet: 0,
    ...(kullanim as Partial<KullanımRow> | null ?? {}),
  };

  const paketIsim: Record<string, string> = {
    ucretsiz: "Ücretsiz",
    baslangic: "Başlangıç",
    profesyonel: "Profesyonel AI",
    premium: "Premium AI",
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-white mb-1">AI Kullanım</h1>
        <p className="text-white/40 text-sm">
          {ay} dönemi — Paket:{" "}
          <span className="text-[#C89434] font-medium">{paketIsim[paket] ?? paket}</span>
        </p>
      </div>

      {/* Kullanım kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <KullanımKart
          baslik="Chatbot Mesajı"
          kullanildi={k.chatbotMesaj}
          limit={limitler.chatbotMesaj}
          alt={`${(limitler.chatbotMesaj - k.chatbotMesaj).toLocaleString("tr-TR")} mesaj kaldı`}
        />
        <KullanımKart
          baslik="Çeviri Çağrısı"
          kullanildi={k.ceviriCagri}
          limit={limitler.ceviriCagri}
          alt={`${(limitler.ceviriCagri - k.ceviriCagri).toLocaleString("tr-TR")} çağrı kaldı`}
        />
        <KullanımKart
          baslik="Menü İmport"
          kullanildi={k.menuImport}
          limit={limitler.menuImport}
          alt={`${limitler.menuImport - k.menuImport} import kaldı`}
        />
      </div>

      {/* Token detayı (debug / maliyet takibi) */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-4">
          Token Detayı — Bu Ay
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
          {[
            { label: "Input Token", value: k.toplamInputToken.toLocaleString("tr-TR") },
            { label: "Output Token", value: k.toplamOutputToken.toLocaleString("tr-TR") },
            { label: "Tahmini Maliyet", value: `₺${Number(k.toplamMaliyet).toFixed(2)}` },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-white/30 text-xs mb-1">{item.label}</p>
              <p className="text-white font-medium">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-white/8">
          {[
            {
              label: "Cache Write",
              value: k.toplamCacheCreate.toLocaleString("tr-TR"),
              renk: k.toplamCacheCreate > 0 ? "text-[#C89434]" : "text-white/30",
            },
            {
              label: "Cache Read",
              value: k.toplamCacheRead.toLocaleString("tr-TR"),
              renk: k.toplamCacheRead > 0 ? "text-emerald-400" : "text-white/30",
            },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-white/30 text-xs mb-1">{item.label}</p>
              <p className={`font-medium ${item.renk}`}>{item.value}</p>
            </div>
          ))}
        </div>
        {k.toplamCacheRead > 0 && (
          <p className="text-white/30 text-xs mt-4">
            Prompt caching aktif — cache read oranı:{" "}
            <span className="text-emerald-400">
              %
              {Math.round(
                (k.toplamCacheRead / Math.max(k.toplamInputToken + k.toplamCacheRead, 1)) * 100
              )}
            </span>
          </p>
        )}
        {k.toplamCacheCreate > 0 && k.toplamCacheRead === 0 && (
          <p className="text-white/30 text-xs mt-4">
            Cache yazıldı — sonraki mesajlar cache read kullanacak
          </p>
        )}
      </div>

      {/* Paket yükseltme CTA */}
      {(paket === "ucretsiz" || paket === "baslangic") && (
        <div className="mt-6 rounded-2xl border border-[#C89434]/30 bg-[#C89434]/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white font-medium text-sm">AI özelliklerini açmak ister misiniz?</p>
            <p className="text-white/40 text-xs mt-1">
              Profesyonel AI paketi ile chatbot, otomatik çeviri ve menü aktarımı kullanabilirsiniz.
            </p>
          </div>
          <a
            href="/dashboard/abonelik"
            className="flex-shrink-0 px-5 py-2.5 rounded-full bg-[#C89434] text-black font-semibold text-sm hover:bg-[#d4a03e] transition-colors"
          >
            Paketi Yükselt →
          </a>
        </div>
      )}
    </div>
  );
}
