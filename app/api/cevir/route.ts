import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const cache = new Map<string, string>();

export async function POST(req: NextRequest) {
  const { metin, dil, dilIsim } = (await req.json()) as {
    metin: string;
    dil: string;
    dilIsim?: string;
  };

  if (!metin || !dil || dil === "tr") {
    return NextResponse.json({ ceviri: metin });
  }

  const cacheKey = `${dil}:${metin}`;
  if (cache.has(cacheKey)) {
    return NextResponse.json({ ceviri: cache.get(cacheKey) });
  }

  const hedefDil =
    dil === "en" ? "English" :
    dil === "ru" ? "Russian" :
    (dilIsim || dil);

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `Translate this Turkish text to ${hedefDil}. Reply with ONLY the translation, no explanation:\n\n${metin}`,
      }],
    });
    const ceviri = res.content[0].type === "text" ? res.content[0].text.trim() : metin;
    cache.set(cacheKey, ceviri);
    return NextResponse.json({ ceviri });
  } catch {
    return NextResponse.json({ ceviri: metin });
  }
}
