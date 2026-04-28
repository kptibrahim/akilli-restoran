import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { cevirMetinler } from "@/lib/translate";

const adminDb = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { isim, slug } = await req.json();

    if (!isim || !slug) {
      return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 401 });
    }

    const { data: mevcut } = await db
      .from("Restoran")
      .select("id")
      .eq("slug", slug)
      .single();

    if (mevcut) {
      return NextResponse.json({ error: "Bu slug zaten kullanımda" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data: restoran, error } = await adminDb
      .from("Restoran")
      .insert({
        id: crypto.randomUUID(),
        userId: user.id,
        isim,
        slug,
        renk: "#FF6B35",
        timezone: "Europe/Istanbul",
        aktif: true,
        selectedLanguages: ["tr"],
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (error) {
      console.error("Restoran oluşturma hatası:", error.code, error.message);
      return NextResponse.json({ error: "Restoran oluşturulamadı. Lütfen tekrar deneyin." }, { status: 500 });
    }

    // Pilot aboneliği otomatik oluştur
    await adminDb.from("Abonelik").insert({
      id: crypto.randomUUID(),
      restoranId: restoran.id,
      paket: "profesyonel",
      durum: "aktif",
      notlar: "Pilot dönem - ücretsiz erişim",
    });

    return NextResponse.json({ restoran }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { isim, logo, aciklama, renk, sosyalMedya, selectedLanguages, wifiAdi, wifiSifre, timezone } = await req.json();

    if (!isim?.trim()) {
      return NextResponse.json({ error: "Restoran adı boş olamaz" }, { status: 400 });
    }

    // Mevcut restoran verilerini çek (translations ve selectedLanguages için)
    const { data: mevcut } = await adminDb
      .from("Restoran")
      .select("id, translations, selectedLanguages, aciklama")
      .eq("userId", user.id)
      .single();

    const hedefDiller = (
      (selectedLanguages as string[] | null) ??
      (mevcut?.selectedLanguages as string[] | null) ??
      ["tr"]
    ).filter((d) => d !== "tr");

    // Açıklama (slogan) çevirisi — değiştiyse veya yeni dil seçildiyse
    let translations = (mevcut?.translations as Record<string, Record<string, string>> | null) ?? {};
    if (aciklama?.trim() && hedefDiller.length > 0) {
      try {
        const translated = await cevirMetinler({ aciklama: aciklama.trim() }, hedefDiller);
        const yeniTranslations: Record<string, Record<string, string>> = {};
        for (const dil of hedefDiller) {
          yeniTranslations[dil] = {
            aciklama: translated["aciklama"]?.[dil] ?? aciklama.trim(),
          };
        }
        translations = yeniTranslations;
      } catch { /* sessizce geç */ }
    }

    const { error } = await adminDb
      .from("Restoran")
      .update({
        isim: isim.trim(),
        logo: logo || null,
        aciklama: aciklama?.trim() || null,
        renk: renk || "#f97316",
        sosyalMedya: sosyalMedya ?? null,
        ...(selectedLanguages ? { selectedLanguages } : {}),
        wifiAdi: wifiAdi?.trim() || null,
        wifiSifre: wifiSifre?.trim() || null,
        translations,
        ...(timezone ? { timezone } : {}),
      })
      .eq("userId", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ basarili: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
