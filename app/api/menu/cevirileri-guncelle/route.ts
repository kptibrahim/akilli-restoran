import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";
import { cevirMetinler } from "@/lib/translate";

const adminDb = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Auth kontrolü
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { restoranId } = (await req.json()) as { restoranId: string };
  if (!restoranId) return NextResponse.json({ error: "restoranId gerekli" }, { status: 400 });

  // Restoranın sahibi mi kontrol et
  const { data: restoran } = await adminDb
    .from("Restoran")
    .select("id, selectedLanguages, aciklama")
    .eq("id", restoranId)
    .eq("userId", user.id)
    .single();

  if (!restoran) return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });

  const hedefDiller = ((restoran.selectedLanguages as string[] | null) ?? ["tr"]).filter(
    (d) => d !== "tr"
  );
  if (hedefDiller.length === 0) {
    return NextResponse.json({ basarili: true, mesaj: "Çeviri gereken dil yok" });
  }

  // Tüm kategorileri ve ürünleri çek
  const { data: kategoriler } = await adminDb
    .from("Kategori")
    .select("id, isim, urunler:Urun(id, isim, aciklama)")
    .eq("restoranId", restoranId)
    .order("sira");

  if (!kategoriler || kategoriler.length === 0) {
    return NextResponse.json({ basarili: true, mesaj: "Çevrilecek içerik yok" });
  }

  // Tüm metinleri tek dict'e topla
  const metinler: Record<string, string> = {};

  if (restoran.aciklama) metinler["restoran_aciklama"] = restoran.aciklama;

  for (const kat of kategoriler) {
    metinler[`k_${kat.id}`] = kat.isim;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const urun of (kat.urunler as any[]) ?? []) {
      metinler[`u_${urun.id}_isim`] = urun.isim;
      if (urun.aciklama) metinler[`u_${urun.id}_aciklama`] = urun.aciklama;
    }
  }

  // Tek API çağrısıyla tüm metinleri çevir
  let translated: Record<string, Record<string, string>> = {};
  try {
    translated = await cevirMetinler(metinler, hedefDiller);
  } catch (err) {
    console.error("Çeviri hatası:", err);
    return NextResponse.json({ error: "Çeviri API hatası" }, { status: 500 });
  }

  // Restoran sloganını güncelle
  if (metinler["restoran_aciklama"]) {
    const restoranTranslations: Record<string, Record<string, string>> = {};
    for (const dil of hedefDiller) {
      restoranTranslations[dil] = {
        aciklama: translated["restoran_aciklama"]?.[dil] ?? restoran.aciklama,
      };
    }
    await adminDb
      .from("Restoran")
      .update({ translations: restoranTranslations })
      .eq("id", restoranId);
  }

  // Kategorileri güncelle
  const katGuncelle: Promise<unknown>[] = kategoriler.map(async (kat) => {
    const katTranslations: Record<string, Record<string, string>> = {};
    for (const dil of hedefDiller) {
      katTranslations[dil] = { isim: translated[`k_${kat.id}`]?.[dil] ?? kat.isim };
    }
    return Promise.resolve(adminDb.from("Kategori").update({ translations: katTranslations }).eq("id", kat.id));
  });

  // Ürünleri güncelle
  const urunGuncelle: Promise<unknown>[] = [];
  for (const kat of kategoriler) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const urun of (kat.urunler as any[]) ?? []) {
      const urunTranslations: Record<string, Record<string, string>> = {};
      for (const dil of hedefDiller) {
        urunTranslations[dil] = { isim: translated[`u_${urun.id}_isim`]?.[dil] ?? urun.isim };
        if (urun.aciklama) {
          urunTranslations[dil].aciklama =
            translated[`u_${urun.id}_aciklama`]?.[dil] ?? urun.aciklama;
        }
      }
      urunGuncelle.push(
        Promise.resolve(adminDb.from("Urun").update({ translations: urunTranslations }).eq("id", urun.id))
      );
    }
  }

  await Promise.all([...katGuncelle, ...urunGuncelle]);

  return NextResponse.json({
    basarili: true,
    istatistik: {
      kategoriler: kategoriler.length,
      urunler: urunGuncelle.length,
      diller: hedefDiller,
    },
  });
}
