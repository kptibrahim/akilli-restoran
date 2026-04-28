import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

async function getRestoranId(): Promise<string | null> {
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

// PATCH /api/odeme-arsiv/[id] → ödendi olarak işaretle
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const restoranId = await getRestoranId();
  if (!restoranId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { id } = await params;
  const { odemeYontemi, odemeAlanKisi } = await req.json();

  const { data, error } = await adminDb
    .from("OdemeArsiv")
    .update({
      odendi: true,
      odendiTarih: new Date().toISOString(),
      odemeYontemi: odemeYontemi ?? null,
      odemeAlanKisi: odemeAlanKisi ?? null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("restoranId", restoranId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // AnalitikKayit'e ödeme yöntemini yaz (siparisId üzerinden eşle)
  if (data?.siparisId) {
    await adminDb
      .from("AnalitikKayit")
      .update({ odemeYontemi: odemeYontemi ?? null })
      .eq("siparisId", data.siparisId)
      .eq("restoranId", restoranId);
  }

  return NextResponse.json({ kayit: data });
}
