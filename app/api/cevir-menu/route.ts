import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Kategori, Urun } from "@/lib/types";

type KategoriRow = Kategori & { sira: number };

export async function POST(req: NextRequest) {
  const { kategoriler, dil, dilIsim } = (await req.json()) as {
    kategoriler: KategoriRow[];
    dil: string;
    dilIsim?: string;
  };

  if (!dil || dil === "tr" || !kategoriler?.length) {
    return NextResponse.json({ kategoriler });
  }

  const hedefDil =
    dil === "en" ? "English" :
    dil === "ru" ? "Russian" :
    (dilIsim || dil);

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
      messages: [{
        role: "user",
        content: `Translate the following JSON values from Turkish to ${hedefDil}. Keep keys exactly as-is. Only translate the string values. Return ONLY valid JSON, no markdown fences, no explanation.\n\n${JSON.stringify(metinler)}`,
      }],
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

    return NextResponse.json({ kategoriler: cevrilmis });
  } catch {
    return NextResponse.json({ kategoriler });
  }
}
