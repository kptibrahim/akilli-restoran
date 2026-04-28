import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { validateRestoranId } from "@/lib/restoran-dogrula";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getIp } from "@/lib/get-ip";

export async function POST(req: NextRequest) {
  try {
    const { restoranId, masaNo, tip = "garson" } = await req.json();
    if (!restoranId || !masaNo) {
      return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
    }

    // Restoran doğrulama
    const restoran = await validateRestoranId(restoranId);
    if (!restoran) {
      console.warn(`[garson-cagir] Geçersiz restoranId: ${restoranId} — IP: ${getIp(req)}`);
      return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });
    }

    // Rate limiting — masa başına 3/dakika, restoran başına 30/dakika
    const [masaLimit, restoranLimit] = await Promise.all([
      rateLimit(`garson:masa:${restoranId}:${masaNo}`, 3, 60),
      rateLimit(`garson:restoran:${restoranId}`, 30, 60),
    ]);

    if (!masaLimit.success || !restoranLimit.success) {
      const failed = !masaLimit.success ? masaLimit : restoranLimit;
      return NextResponse.json(
        { error: "Çok fazla istek gönderildi", resetAt: failed.resetAt.toISOString() },
        { status: 429, headers: rateLimitHeaders(failed) }
      );
    }

    // Önceki aktif çağrıları temizle
    await adminDb
      .from("GarsonCagri")
      .delete()
      .eq("restoranId", restoranId)
      .eq("masaNo", masaNo);

    const { data, error } = await adminDb
      .from("GarsonCagri")
      .insert({ restoranId, masaNo, durum: "bekliyor", tip })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    await adminDb.from("GarsonCagri").delete().eq("id", id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
