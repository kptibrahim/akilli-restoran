import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { urunCevirisiOlustur } from "@/lib/translate";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Restoranın seçili dillerini (tr hariç) döndürür */
async function hedefDilleriGetir(restoranId: string): Promise<string[]> {
  const { data } = await db
    .from("Restoran")
    .select("selectedLanguages")
    .eq("id", restoranId)
    .single();
  const diller = (data?.selectedLanguages as string[] | null) ?? ["tr"];
  return diller.filter((d) => d !== "tr");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restoranId = searchParams.get("restoranId");
  if (!restoranId) return NextResponse.json({ error: "restoranId gerekli" }, { status: 400 });
  const { data } = await db
    .from("Kategori")
    .select("*, urunler:Urun(*)")
    .eq("restoranId", restoranId)
    .order("sira");
  return NextResponse.json({ kategoriler: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tip, restoranId, ...veri } = body;

  if (tip === "kategori") {
    const sira = typeof veri.sira === "number" ? veri.sira : 0;
    const id = crypto.randomUUID();
    const { data, error } = await db
      .from("Kategori")
      .insert({ id, restoranId, isim: veri.isim, sira, emoji: veri.emoji || null })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Arka planda çeviri (await → güvenilir)
    const hedefDiller = await hedefDilleriGetir(restoranId);
    if (hedefDiller.length > 0) {
      const translations = await urunCevirisiOlustur({ isim: veri.isim }, hedefDiller);
      if (Object.keys(translations).length > 0) {
        await db.from("Kategori").update({ translations }).eq("id", id);
      }
    }

    return NextResponse.json({ kategori: data }, { status: 201 });
  }

  if (tip === "urun") {
    const sira = typeof veri.sira === "number" ? veri.sira : 0;
    const id = crypto.randomUUID();
    const { data, error } = await db
      .from("Urun")
      .insert({
        id,
        kategoriId: veri.kategoriId,
        isim: veri.isim,
        aciklama: veri.aciklama || null,
        fiyat: parseFloat(veri.fiyat),
        kalori: veri.kalori ? parseInt(veri.kalori) : null,
        icerik: veri.icerik || null,
        alerjenler: veri.alerjenler || null,
        gorsel: veri.gorsel || null,
        sira,
        aktif: true,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Ürün çevirisi
    const hedefDiller = await hedefDilleriGetir(restoranId);
    if (hedefDiller.length > 0) {
      const translations = await urunCevirisiOlustur(
        { isim: veri.isim, aciklama: veri.aciklama || null },
        hedefDiller
      );
      if (Object.keys(translations).length > 0) {
        await db.from("Urun").update({ translations }).eq("id", id);
      }
    }

    return NextResponse.json({ urun: data }, { status: 201 });
  }

  return NextResponse.json({ error: "Geçersiz tip" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const { kategoriId, emoji } = await req.json();
  if (!kategoriId) return NextResponse.json({ error: "kategoriId gerekli" }, { status: 400 });
  const { error } = await db.from("Kategori").update({ emoji: emoji || null }).eq("id", kategoriId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const urunId = searchParams.get("urunId");
  const kategoriId = searchParams.get("kategoriId");
  if (urunId) {
    await db.from("Urun").delete().eq("id", urunId);
    return NextResponse.json({ ok: true });
  }
  if (kategoriId) {
    await db.from("Kategori").delete().eq("id", kategoriId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id gerekli" }, { status: 400 });
}
