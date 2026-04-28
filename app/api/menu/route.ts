import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { urunCevirisiOlustur } from "@/lib/translate";
import { validateRestoranId } from "@/lib/restoran-dogrula";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getIp } from "@/lib/get-ip";

async function hedefDilleriGetir(restoranId: string): Promise<string[]> {
  const { data } = await adminDb
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

  const restoran = await validateRestoranId(restoranId);
  if (!restoran) {
    console.warn(`[menu] Geçersiz restoranId: ${restoranId} — IP: ${getIp(req)}`);
    return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });
  }

  const { data } = await adminDb
    .from("Kategori")
    .select("*, urunler:Urun(*)")
    .eq("restoranId", restoranId)
    .order("sira");
  return NextResponse.json({ kategoriler: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tip, restoranId, ...veri } = body;

  if (!restoranId) return NextResponse.json({ error: "restoranId gerekli" }, { status: 400 });

  const restoran = await validateRestoranId(restoranId);
  if (!restoran) {
    console.warn(`[menu/POST] Geçersiz restoranId: ${restoranId} — IP: ${getIp(req)}`);
    return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });
  }

  // Rate limiting — authenticated dashboard isteği, yüksek limit
  const ip = getIp(req);
  const limit = await rateLimit(`menu:post:ip:${ip}`, 200, 3600);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi", resetAt: limit.resetAt.toISOString() },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  if (tip === "kategori") {
    const sira = typeof veri.sira === "number" ? veri.sira : 0;
    const id = crypto.randomUUID();
    const { data, error } = await adminDb
      .from("Kategori")
      .insert({ id, restoranId, isim: veri.isim, sira, emoji: veri.emoji || null })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const hedefDiller = await hedefDilleriGetir(restoranId);
    if (hedefDiller.length > 0) {
      const translations = await urunCevirisiOlustur({ isim: veri.isim }, hedefDiller);
      if (Object.keys(translations).length > 0) {
        await adminDb.from("Kategori").update({ translations }).eq("id", id);
      }
    }

    return NextResponse.json({ kategori: data }, { status: 201 });
  }

  if (tip === "urun") {
    const sira = typeof veri.sira === "number" ? veri.sira : 0;
    const id = crypto.randomUUID();
    const { data, error } = await adminDb
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

    const hedefDiller = await hedefDilleriGetir(restoranId);
    if (hedefDiller.length > 0) {
      const translations = await urunCevirisiOlustur(
        { isim: veri.isim, aciklama: veri.aciklama || null },
        hedefDiller
      );
      if (Object.keys(translations).length > 0) {
        await adminDb.from("Urun").update({ translations }).eq("id", id);
      }
    }

    return NextResponse.json({ urun: data }, { status: 201 });
  }

  return NextResponse.json({ error: "Geçersiz tip" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const { kategoriId, emoji } = await req.json();
  if (!kategoriId) return NextResponse.json({ error: "kategoriId gerekli" }, { status: 400 });
  const { error } = await adminDb
    .from("Kategori")
    .update({ emoji: emoji || null })
    .eq("id", kategoriId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const urunId = searchParams.get("urunId");
  const kategoriId = searchParams.get("kategoriId");
  if (urunId) {
    await adminDb.from("Urun").delete().eq("id", urunId);
    return NextResponse.json({ ok: true });
  }
  if (kategoriId) {
    await adminDb.from("Kategori").delete().eq("id", kategoriId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id gerekli" }, { status: 400 });
}
