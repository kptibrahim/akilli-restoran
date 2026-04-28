import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/odeme-arsiv/migrate — localStorage verisini DB'ye taşı
// Idempotent: aynı siparisId tekrar eklenmez
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { data: restoran } = await adminDb
    .from("Restoran")
    .select("id")
    .eq("userId", user.id)
    .single();
  if (!restoran) return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });

  const restoranId = restoran.id;

  // Günde 1 kez sınırı
  const limit = await rateLimit(`migrate:${restoranId}`, 1, 86400);
  if (!limit.success) {
    return NextResponse.json({ error: "Migration bugün zaten yapıldı" }, { status: 429 });
  }

  const { bekleyenler = [], arsiv = [] } = await req.json();
  const now = new Date().toISOString();

  const tumKayitlar = [
    ...bekleyenler.map((k: any) => ({
      id: crypto.randomUUID(),
      restoranId,
      siparisId: k.id ?? null,
      masaNo: k.masaNo,
      urunler: k.urunler ?? [],
      toplam: k.toplam ?? 0,
      not: k.notlar ?? null,
      odendi: false,
      createdAt: k.teslimSaati ?? now,
      updatedAt: now,
    })),
    ...arsiv.map((k: any) => ({
      id: crypto.randomUUID(),
      restoranId,
      siparisId: k.id ?? null,
      masaNo: k.masaNo,
      urunler: k.urunler ?? [],
      toplam: k.toplam ?? 0,
      not: k.notlar ?? null,
      odendi: true,
      odendiTarih: k.odemeZamani ?? now,
      createdAt: k.teslimSaati ?? now,
      updatedAt: now,
    })),
  ];

  if (tumKayitlar.length === 0) {
    return NextResponse.json({ ok: true, tasinan: 0 });
  }

  const { error } = await adminDb.from("OdemeArsiv").upsert(tumKayitlar, {
    onConflict: "id",
    ignoreDuplicates: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tasinan: tumKayitlar.length });
}
