import Anthropic from "@anthropic-ai/sdk";

export const DIL_ISIM: Record<string, string> = {
  en: "English",
  ru: "Russian",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  ar: "Arabic",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  pt: "Portuguese",
  ko: "Korean",
  nl: "Dutch",
  pl: "Polish",
  uk: "Ukrainian",
};

export const DIL_BAYRAK: Record<string, { bayrak: string; kisaltma: string; isim: string }> = {
  tr: { bayrak: "🇹🇷", kisaltma: "TR", isim: "Türkçe" },
  en: { bayrak: "🇬🇧", kisaltma: "EN", isim: "English" },
  ru: { bayrak: "🇷🇺", kisaltma: "RU", isim: "Русский" },
  de: { bayrak: "🇩🇪", kisaltma: "DE", isim: "Deutsch" },
  fr: { bayrak: "🇫🇷", kisaltma: "FR", isim: "Français" },
  es: { bayrak: "🇪🇸", kisaltma: "ES", isim: "Español" },
  it: { bayrak: "🇮🇹", kisaltma: "IT", isim: "Italiano" },
  ar: { bayrak: "🇸🇦", kisaltma: "AR", isim: "العربية" },
  zh: { bayrak: "🇨🇳", kisaltma: "ZH", isim: "中文" },
  ja: { bayrak: "🇯🇵", kisaltma: "JA", isim: "日本語" },
  pt: { bayrak: "🇵🇹", kisaltma: "PT", isim: "Português" },
  ko: { bayrak: "🇰🇷", kisaltma: "KO", isim: "한국어" },
  nl: { bayrak: "🇳🇱", kisaltma: "NL", isim: "Nederlands" },
  pl: { bayrak: "🇵🇱", kisaltma: "PL", isim: "Polski" },
  uk: { bayrak: "🇺🇦", kisaltma: "UK", isim: "Українська" },
};

export const TUM_DILLER = Object.keys(DIL_BAYRAK);

/**
 * Türkçe metinleri birden fazla dile tek API çağrısında çevirir.
 *
 * @param metinler  { "anahtar": "türkçe metin" }
 * @param hedefDiller  ["en", "ru", "de", ...]  (tr içermemeli)
 * @returns { "anahtar": { "en": "...", "ru": "...", "de": "..." } }
 */
export async function cevirMetinler(
  metinler: Record<string, string>,
  hedefDiller: string[]
): Promise<Record<string, Record<string, string>>> {
  if (hedefDiller.length === 0 || Object.keys(metinler).length === 0) return {};

  const dilListesi = hedefDiller
    .map((d) => `"${d}" (${DIL_ISIM[d] ?? d})`)
    .join(", ");

  const prompt = `Translate each Turkish text value to these languages: ${dilListesi}.
Return ONLY valid JSON, no markdown fences, no explanation.
Structure: each key maps to an object where language codes are keys and translations are values.

Input:
${JSON.stringify(metinler, null, 2)}

Expected output structure example (adapt to actual input keys and languages):
{
  "key1": {"en": "translation", "ru": "translation"},
  "key2": {"en": "translation", "ru": "translation"}
}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content[0].type === "text" ? res.content[0].text.trim() : "";
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  return JSON.parse(jsonText) as Record<string, Record<string, string>>;
}

/**
 * Tek bir ürün veya kategorinin translations JSONB'sini oluşturur.
 *
 * @param alanlar  { isim: "...", aciklama: "..." }  (türkçe)
 * @param hedefDiller  ["en", "ru"]
 * @returns  { "en": { "isim": "...", "aciklama": "..." }, "ru": {...} }
 */
export async function urunCevirisiOlustur(
  alanlar: { isim: string; aciklama?: string | null },
  hedefDiller: string[]
): Promise<Record<string, Record<string, string>>> {
  if (hedefDiller.length === 0) return {};

  const metinler: Record<string, string> = { isim: alanlar.isim };
  if (alanlar.aciklama) metinler.aciklama = alanlar.aciklama;

  try {
    const translated = await cevirMetinler(metinler, hedefDiller);
    const translations: Record<string, Record<string, string>> = {};
    for (const dil of hedefDiller) {
      translations[dil] = { isim: translated["isim"]?.[dil] ?? alanlar.isim };
      if (alanlar.aciklama) {
        translations[dil].aciklama = translated["aciklama"]?.[dil] ?? alanlar.aciklama;
      }
    }
    return translations;
  } catch {
    return {};
  }
}
