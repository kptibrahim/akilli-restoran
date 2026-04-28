import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getIp } from "@/lib/get-ip";

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

async function kvGet(key: string): Promise<string | null> {
  if (!process.env.KV_REST_API_URL) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return await kv.get<string>(key);
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: string, exSec: number): Promise<void> {
  if (!process.env.KV_REST_API_URL) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(key, value, { ex: exSec });
  } catch {
    // KV yazma hatası çeviriyi engellemez
  }
}

export async function POST(req: NextRequest) {
  const { metin, dil, dilIsim } = (await req.json()) as {
    metin: string;
    dil: string;
    dilIsim?: string;
  };

  if (!metin || !dil || dil === "tr") {
    return NextResponse.json({ ceviri: metin });
  }

  // Rate limiting — IP başına 100 istek/saat
  const ip = getIp(req);
  const limit = await rateLimit(`cevir:ip:${ip}`, 100, 3600);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi", resetAt: limit.resetAt.toISOString() },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  // Vercel KV cache — 7 gün TTL (cold start'ta sıfırlanmaz)
  const kvKey = `cevir:${dil}:${simpleHash(metin)}`;
  const cached = await kvGet(kvKey);
  if (cached) return NextResponse.json({ ceviri: cached });

  const hedefDil =
    dil === "en" ? "English" : dil === "ru" ? "Russian" : dilIsim || dil;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Translate this Turkish text to ${hedefDil}. Reply with ONLY the translation, no explanation:\n\n${metin}`,
        },
      ],
    });
    const ceviri = res.content[0].type === "text" ? res.content[0].text.trim() : metin;

    await kvSet(kvKey, ceviri, 7 * 24 * 3600);
    return NextResponse.json({ ceviri });
  } catch {
    return NextResponse.json({ ceviri: metin });
  }
}
