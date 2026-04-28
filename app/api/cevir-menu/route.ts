import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Kategori, Urun } from "@/lib/types";
import { validateRestoranId } from "@/lib/restoran-dogrula";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getIp } from "@/lib/get-ip";
import { limitKontrol, kayitEkle } from "@/lib/ai-kullanim";

type KategoriRow = Kategori & { sira: number };

export async function POST(req: NextRequest) {
  const { kategoriler, dil, dilIsim, restoranId } = (await req.json()) as {
    kategoriler: KategoriRow[];
    dil: string;
    dilIsim?: string;
    restoranId?: string;
  };

  if (!dil || dil === "tr" || !kategoriler?.length) {
    return NextResponse.json({ kategoriler });
  }

  // Restoran doğrulama (restoranId varsa)
  if (restoranId) {
    const restoran = await validateRestoranId(restoranId);
    if (!restoran) {
      console.warn(`[cevir-menu] Geçersiz restoranId: ${restoranId} — IP: ${getIp(req)}`);
      return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });
    }

    // Paket kontrolü
    const kullanim = await limitKontrol(restoranId, "ceviri");
    if (!kullanim.izinVar) {
      return NextResponse.json({
        error: kullanim.limit === 0
          ? "AI Çeviri bu pakette mevcut değil"
          : "Aylık AI çeviri limitiniz doldu",
        kullanildi: kullanim.kullanildi,
        limit: kullanim.limit,
        paket: kullanim.paket,
        upgradeUrl: "/dashboard/abonelik",
      }, { status: 402 });
    }
  }

  // Rate limiting — restoranId başına 10/saat, IP başına 20/saat
  const ip = getIp(req);
  const limitKey = restoranId ? `cevir-menu:restoran:${restoranId}` : `cevir-menu:ip:${ip}`;
  const limit = await rateLimit(limitKey, restoranId ? 10 : 20, 3600);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi", resetAt: limit.resetAt.toISOString() },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  const hedefDil =
    dil === "en" ? "English" : dil === "ru" ? "Russian" : dilIsim || dil;

  const metinler: Record<string, string> = {};
  for (const kat of kategoriler) {
    metinler[`k_${kat.id}`] = kat.isim;
    for (const urun of kat.urunler) {
      metinler[`u_${urun.id}_isim`] = urun.isim;
      if (urun.aciklama) metinler[`u_${urun.id}_aciklama`] = urun.aciklama;
    }
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Translate the following JSON values from Turkish to ${hedefDil}. Keep keys exactly as-is. Only translate the string values. Return ONLY valid JSON, no markdown fences, no explanation.\n\n${JSON.stringify(metinler)}`,
        },
      ],
    });

    const text = res.content[0].type === "text" ? res.content[0].text : "";
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
    const ceviri = JSON.parse(jsonText) as Record<string, string>;

    const cevrilmis = kategoriler.map((kat) => ({
      ...kat,
      isim: ceviri[`k_${kat.id}`] ?? kat.isim,
      urunler: kat.urunler.map((urun: Urun) => ({
        ...urun,
        isim: ceviri[`u_${urun.id}_isim`] ?? urun.isim,
        aciklama: urun.aciklama
          ? (ceviri[`u_${urun.id}_aciklama`] ?? urun.aciklama)
          : urun.aciklama,
      })),
    }));

    if (restoranId) {
      const usage = res.usage as { input_tokens: number; output_tokens: number };
      kayitEkle({
        restoranId,
        tip: "ceviri",
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        model: "haiku-4-5",
      }).catch(() => {});
    }

    return NextResponse.json({ kategoriler: cevrilmis });
  } catch {
    return NextResponse.json({ kategoriler });
  }
}
