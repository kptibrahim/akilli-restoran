import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { validateRestoranId } from "@/lib/restoran-dogrula";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getIp } from "@/lib/get-ip";

export async function POST(req: NextRequest) {
  const { restoranId, masaNo, urunler, toplam, notlar } = await req.json();
  if (!restoranId || !masaNo || !urunler?.length) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  // Restoran doğrulama
  const restoran = await validateRestoranId(restoranId);
  if (!restoran) {
    console.warn(`[siparis] Geçersiz restoranId: ${restoranId} — IP: ${getIp(req)}`);
    return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });
  }

  // Rate limiting — IP başına 10/saat, masa başına 5/15 dakika
  const ip = getIp(req);
  const [ipLimit, masaLimit] = await Promise.all([
    rateLimit(`siparis:ip:${ip}`, 30, 3600),
    rateLimit(`siparis:masa:${restoranId}:${masaNo}`, 20, 900),
  ]);

  if (!ipLimit.success || !masaLimit.success) {
    const failed = !ipLimit.success ? ipLimit : masaLimit;
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi", resetAt: failed.resetAt.toISOString() },
      { status: 429, headers: rateLimitHeaders(failed) }
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await adminDb
    .from("Siparis")
    .insert({
      id: crypto.randomUUID(),
      restoranId,
      masaNo,
      urunler,
      toplam,
      notlar,
      durum: "bekliyor",
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ siparis: data }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restoranId = searchParams.get("restoranId");
  const arsiv = searchParams.get("arsiv") === "true";

  if (!restoranId) return NextResponse.json({ error: "restoranId gerekli" }, { status: 400 });

  const restoran = await validateRestoranId(restoranId);
  if (!restoran) {
    return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });
  }

  if (arsiv) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await adminDb
      .from("Siparis")
      .select("*")
      .eq("restoranId", restoranId)
      .gte("createdAt", since)
      .order("createdAt", { ascending: false });
    return NextResponse.json({ siparisler: data ?? [] });
  }

  const { data } = await adminDb
    .from("Siparis")
    .select("*")
    .eq("restoranId", restoranId)
    .neq("durum", "teslim")
    .order("createdAt", { ascending: false })
    .limit(50);
  return NextResponse.json({ siparisler: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restoranId = searchParams.get("restoranId");

  if (!restoranId) return NextResponse.json({ error: "restoranId gerekli" }, { status: 400 });

  const restoran = await validateRestoranId(restoranId);
  if (!restoran) {
    return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await adminDb
    .from("Siparis")
    .delete()
    .eq("restoranId", restoranId)
    .lt("createdAt", since);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const { siparisId, durum } = await req.json();
  const { data, error } = await adminDb
    .from("Siparis")
    .update({ durum, updatedAt: new Date().toISOString() })
    .eq("id", siparisId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (durum === "teslim" && data) {
    await adminDb.from("AnalitikKayit").insert({
      id: crypto.randomUUID(),
      restoranId: data.restoranId,
      siparisId: data.id,
      masaNo: data.masaNo,
      urunler: data.urunler,
      toplam: data.toplam,
      notlar: data.notlar ?? null,
      createdAt: data.createdAt,
    });
  }

  return NextResponse.json({ siparis: data });
}
