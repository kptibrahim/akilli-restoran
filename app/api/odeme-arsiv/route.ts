import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

async function getRestoranId(req: NextRequest): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await adminDb.from("Restoran").select("id").eq("userId", user.id).single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

// GET /api/odeme-arsiv?odendi=false → bekleyenler
// GET /api/odeme-arsiv?odendi=true&donem=gunluk|haftalik|aylik → arşiv
export async function GET(req: NextRequest) {
  const restoranId = await getRestoranId(req);
  if (!restoranId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const odendi = searchParams.get("odendi") !== "false";
  const donem = searchParams.get("donem") ?? "gunluk";

  let query = adminDb
    .from("OdemeArsiv")
    .select("*")
    .eq("restoranId", restoranId)
    .eq("odendi", odendi)
    .order("createdAt", { ascending: false });

  if (odendi) {
    const now = new Date();
    let since: Date;
    if (donem === "aylik") {
      since = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (donem === "haftalik") {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    query = query.gte("createdAt", since.toISOString());
  }

  query = query.limit(200);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kayitlar: data ?? [] });
}

// POST /api/odeme-arsiv → yeni bekleyen ödeme kaydı
export async function POST(req: NextRequest) {
  const restoranId = await getRestoranId(req);
  if (!restoranId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const { siparisId, masaNo, urunler, toplam, not } = body;

  if (!masaNo || !urunler) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await adminDb
    .from("OdemeArsiv")
    .insert({
      id: crypto.randomUUID(),
      restoranId,
      siparisId: siparisId ?? null,
      masaNo,
      urunler,
      toplam: toplam ?? 0,
      not: not ?? null,
      odendi: false,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kayit: data }, { status: 201 });
}

// DELETE /api/odeme-arsiv → 30 gün+ eski kayıtları temizle
export async function DELETE(req: NextRequest) {
  const restoranId = await getRestoranId(req);
  if (!restoranId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await adminDb
    .from("OdemeArsiv")
    .delete()
    .eq("restoranId", restoranId)
    .lt("createdAt", since);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
