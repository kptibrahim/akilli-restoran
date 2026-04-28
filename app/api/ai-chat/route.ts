import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/lib/supabase-admin";
import { validateRestoranId } from "@/lib/restoran-dogrula";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getIp } from "@/lib/get-ip";
import { getBasePrompt, getMenuContext } from "@/lib/ai-prompts";
import { limitKontrol, kayitEkle } from "@/lib/ai-kullanim";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultHeaders: { "anthropic-beta": "prompt-caching-2024-07-31" },
});

type UrunInfo = {
  id: string;
  isim: string;
  fiyat: number;
  gorsel: string | null;
  kategoriId: string;
};

type KategoriRow = {
  id: string;
  isim: string;
  urunler?: Array<{
    id: string;
    isim: string;
    fiyat: number;
    gorsel: string | null;
    kalori: number | null;
    aciklama: string | null;
    icerik: string | null;
    alerjenler: string | null;
  }>;
};

export async function POST(req: NextRequest) {
  try {
    const { restoranId, mesajlar, dil = "tr", dilIsim = "" } = await req.json();

    // 1. Restoran sahiplik doğrulama
    const restoran = await validateRestoranId(restoranId);
    if (!restoran) {
      console.warn(`[ai-chat] Geçersiz restoranId: ${restoranId} — IP: ${getIp(req)}`);
      return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });
    }

    // 2. Rate limiting — IP + restoranId bazlı
    const ip = getIp(req);
    const [ipLimit, restoranLimit] = await Promise.all([
      rateLimit(`ai-chat:ip:${ip}`, 30, 3600),
      rateLimit(`ai-chat:restoran:${restoranId}`, 200, 3600),
    ]);

    if (!ipLimit.success || !restoranLimit.success) {
      const failed = !ipLimit.success ? ipLimit : restoranLimit;
      return NextResponse.json(
        { error: "Çok fazla istek gönderildi", resetAt: failed.resetAt.toISOString() },
        { status: 429, headers: rateLimitHeaders(failed) }
      );
    }

    // 3. Paket limit kontrolü
    const kullanim = await limitKontrol(restoranId, "chatbot");
    if (!kullanim.izinVar) {
      return NextResponse.json(
        {
          error: "Aylık AI mesaj limitiniz doldu",
          kullanildi: kullanim.kullanildi,
          limit: kullanim.limit,
          yukseltLink: "/dashboard/abonelik",
        },
        { status: 402 }
      );
    }

    // 4. Menü verisi çek
    const { data: kategoriler } = await adminDb
      .from("Kategori")
      .select("id, isim, urunler:Urun(id, isim, fiyat, gorsel, kalori, aciklama, icerik, alerjenler)")
      .eq("restoranId", restoranId);

    const urunHaritasi = new Map<string, UrunInfo>();
    const menuSatirlar: string[] = [];

    for (const kat of (kategoriler ?? []) as KategoriRow[]) {
      const urunSatirlar: string[] = [];
      for (const u of kat.urunler ?? []) {
        urunHaritasi.set(u.isim.toLowerCase().trim(), {
          id: u.id,
          isim: u.isim,
          fiyat: u.fiyat,
          gorsel: u.gorsel ?? null,
          kategoriId: kat.id,
        });
        urunSatirlar.push(
          `  - ${u.isim}: ₺${u.fiyat}` +
            (u.kalori ? ` | ${u.kalori} kal` : "") +
            (u.aciklama ? ` | ${u.aciklama}` : "") +
            (u.icerik ? ` | İçerik: ${u.icerik}` : "") +
            (u.alerjenler ? ` | Alerjenler: ${u.alerjenler}` : "")
        );
      }
      menuSatirlar.push(`${kat.isim}:\n${urunSatirlar.join("\n")}`);
    }

    const menuMetni = menuSatirlar.join("\n\n");

    // 5. Anthropic — prompt caching ile (iki blok: base + menü)
    const yanit = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: [
        {
          type: "text" as const,
          text: getBasePrompt(restoran.isim, dil, dilIsim),
          cache_control: { type: "ephemeral" as const },
        },
        {
          type: "text" as const,
          text: getMenuContext(menuMetni),
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: mesajlar.map((m: { rol: string; icerik: string }) => ({
        role: m.rol as "user" | "assistant",
        content: m.icerik,
      })),
    });

    // 6. Token kullanımını logla (cache hit doğrulama)
    const usage = yanit.usage as {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };

    console.log("[ai-chat] usage", {
      restoranId,
      cache_creation: usage.cache_creation_input_tokens ?? 0,
      cache_read: usage.cache_read_input_tokens ?? 0,
      input: usage.input_tokens,
      output: usage.output_tokens,
    });

    // 7. Kullanım kaydı (async — hata response'u etkilemesin)
    kayitEkle({
      restoranId,
      tip: "chatbot",
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens,
      cacheCreationTokens: usage.cache_creation_input_tokens,
      model: "sonnet-4-6",
    }).catch((err) => console.error("[ai-chat] Kullanım kayıt hatası:", err));

    // 8. Yanıtı parse et
    const hamMetin = yanit.content[0].type === "text" ? yanit.content[0].text : "{}";
    let cevap = "";
    let onerilenIsimler: string[] = [];

    try {
      const jsonText = hamMetin.match(/\{[\s\S]*\}/)?.[0] ?? hamMetin;
      const parsed = JSON.parse(jsonText) as { cevap?: string; onerilen?: string[] };
      cevap = parsed.cevap ?? hamMetin;
      onerilenIsimler = Array.isArray(parsed.onerilen) ? parsed.onerilen : [];
    } catch {
      cevap = hamMetin;
    }

    const onerilen: UrunInfo[] = onerilenIsimler
      .map((isim: string) => {
        const key = isim.toLowerCase().trim();
        if (urunHaritasi.has(key)) return urunHaritasi.get(key)!;
        for (const [mapKey, urun] of urunHaritasi) {
          if (mapKey.includes(key) || key.includes(mapKey)) return urun;
        }
        return null;
      })
      .filter((u): u is UrunInfo => u !== null)
      .slice(0, 3);

    await adminDb.from("ChatLog").insert({
      restoranId,
      soru: mesajlar[mesajlar.length - 1]?.icerik ?? "",
      cevap,
    });

    return NextResponse.json({ cevap, onerilen });
  } catch (err) {
    console.error("AI Chat hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
