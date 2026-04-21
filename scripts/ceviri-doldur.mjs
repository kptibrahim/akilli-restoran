// Mevcut tüm restoranlar için çeviri üretir ve DB'ye yazar
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DIL_ISIM = {
  en: "English", ru: "Russian", de: "German", fr: "French",
  es: "Spanish", it: "Italian", ar: "Arabic", zh: "Chinese (Simplified)",
  ja: "Japanese", pt: "Portuguese", ko: "Korean", nl: "Dutch",
  pl: "Polish", uk: "Ukrainian",
};

async function cevirMetinler(metinler, hedefDiller) {
  if (!hedefDiller.length || !Object.keys(metinler).length) return {};
  const dilListesi = hedefDiller.map((d) => `"${d}" (${DIL_ISIM[d] ?? d})`).join(", ");
  const prompt = `Translate each Turkish text value to these languages: ${dilListesi}.
Return ONLY valid JSON, no markdown fences, no explanation.
Structure: each key maps to an object where language codes are keys and translations are values.

Input:
${JSON.stringify(metinler, null, 2)}`;

  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text.trim() : "";
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  return JSON.parse(jsonText);
}

async function restoranCevir(restoran) {
  const hedefDiller = (restoran.selectedLanguages ?? ["tr"]).filter((d) => d !== "tr");
  if (!hedefDiller.length) {
    console.log(`[${restoran.isim}] Çeviri gereken dil yok, atlandı.`);
    return;
  }
  console.log(`\n[${restoran.isim}] → ${hedefDiller.join(", ")} diline çevriliyor...`);

  const { data: kategoriler } = await adminDb
    .from("Kategori")
    .select("id, isim, urunler:Urun(id, isim, aciklama)")
    .eq("restoranId", restoran.id)
    .order("sira");

  if (!kategoriler?.length) { console.log("  Kategori yok, atlandı."); return; }

  // Tüm metinleri tek dict'e topla
  const metinler = {};
  if (restoran.aciklama) metinler["restoran_aciklama"] = restoran.aciklama;
  for (const kat of kategoriler) {
    metinler[`k_${kat.id}`] = kat.isim;
    for (const urun of kat.urunler ?? []) {
      metinler[`u_${urun.id}_isim`] = urun.isim;
      if (urun.aciklama) metinler[`u_${urun.id}_aciklama`] = urun.aciklama;
    }
  }

  console.log(`  ${Object.keys(metinler).length} metin çevriliyor...`);
  const translated = await cevirMetinler(metinler, hedefDiller);

  // Restoran açıklaması
  if (metinler["restoran_aciklama"]) {
    const restoranTranslations = {};
    for (const dil of hedefDiller) {
      restoranTranslations[dil] = { aciklama: translated["restoran_aciklama"]?.[dil] ?? restoran.aciklama };
    }
    await adminDb.from("Restoran").update({ translations: restoranTranslations }).eq("id", restoran.id);
  }

  // Kategoriler
  for (const kat of kategoriler) {
    const katTr = {};
    for (const dil of hedefDiller) {
      katTr[dil] = { isim: translated[`k_${kat.id}`]?.[dil] ?? kat.isim };
    }
    await adminDb.from("Kategori").update({ translations: katTr }).eq("id", kat.id);
  }

  // Ürünler
  let urunSayisi = 0;
  for (const kat of kategoriler) {
    for (const urun of kat.urunler ?? []) {
      const urunTr = {};
      for (const dil of hedefDiller) {
        urunTr[dil] = { isim: translated[`u_${urun.id}_isim`]?.[dil] ?? urun.isim };
        if (urun.aciklama) {
          urunTr[dil].aciklama = translated[`u_${urun.id}_aciklama`]?.[dil] ?? urun.aciklama;
        }
      }
      await adminDb.from("Urun").update({ translations: urunTr }).eq("id", urun.id);
      urunSayisi++;
    }
  }

  console.log(`  ✓ ${kategoriler.length} kategori, ${urunSayisi} ürün çevrildi.`);
}

async function main() {
  const { data: restoranlar } = await adminDb
    .from("Restoran")
    .select("id, isim, aciklama, selectedLanguages")
    .not("selectedLanguages", "is", null);

  if (!restoranlar?.length) { console.log("Restoran bulunamadı."); return; }
  console.log(`${restoranlar.length} restoran bulundu.`);

  for (const r of restoranlar) {
    await restoranCevir(r);
  }
  console.log("\n✓ Tüm çeviriler tamamlandı.");
}

main().catch(console.error);
