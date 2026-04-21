import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminDb = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { restoranId, masaNo, tip = "garson" } = await req.json();
    if (!restoranId || !masaNo) {
      return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
    }

    // Bu masa için önceki aktif çağrıları temizle
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
