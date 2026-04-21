import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { buildMenuSystemPrompt } from "@/lib/ai-prompts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

type UrunInfo = {
  id: string;
  isim: string;
  fiyat: number;
  gorsel: string | null;
  kategoriId: string;
};

export async function POST(req: NextRequest) {
  try {
    const { restoranId, mesajlar, dil = "tr", dilIsim = "" } = await req.json();

    const { data: restoran } = await db
      .from("Restoran")
      .select("isim")
      .eq("id", restoranId)
      .single();

    if (!restoran) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    const { data: kategoriler } = await db
      .from("Kategori")
      .select("id, isim, urunler:Urun(id, isim, fiyat, gorsel, kalori, aciklama, icerik, alerjenler)")
      .eq("restoranId", restoranId);

    // Build flat product map (Turkish name → product info) for matching
    const urunHaritasi = new Map<string, UrunInfo>();
    const menuSatirlar: string[] = [];

    for (const kat of (kategoriler ?? []) as Array<{
      id: string;
      isim: string;
      urunler?: Array<{ id: string; isim: string; fiyat: number; gorsel: string | null; kalori: number | null; aciklama: string | null; icerik: string | null; alerjenler: string | null }>;
    }>) {
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
    const sistemPrompt = buildMenuSystemPrompt(restoran.isim, menuMetni, dil, dilIsim);

    const yanit = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: sistemPrompt,
      messages: mesajlar.map((m: { rol: string; icerik: string }) => ({
        role: m.rol as "user" | "assistant",
        content: m.icerik,
      })),
    });

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

    // Match product names to actual products (exact then partial)
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

    // Log kaydet
    await db.from("ChatLog").insert({
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
