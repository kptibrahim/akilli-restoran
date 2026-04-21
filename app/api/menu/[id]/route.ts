import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { urunCevirisiOlustur } from "@/lib/translate";

const adminDb = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await createClient();
  const { id } = await params;
  const { isim, aciklama, fiyat, kalori, icerik, alerjenler, gorsel } = await req.json();

  const { data, error } = await db
    .from("Urun")
    .update({
      isim,
      aciklama: aciklama || null,
      fiyat: parseFloat(fiyat),
      kalori: kalori ? parseInt(kalori) : null,
      icerik: icerik || null,
      alerjenler: alerjenler || null,
      gorsel: gorsel || null,
    })
    .eq("id", id)
    .select("*, Kategori(restoranId)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Çeviriyi güncelle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const restoranId = (data as any)?.Kategori?.restoranId as string | undefined;
  if (restoranId) {
    const { data: restoranData } = await adminDb
      .from("Restoran")
      .select("selectedLanguages")
      .eq("id", restoranId)
      .single();
    const hedefDiller = ((restoranData?.selectedLanguages as string[] | null) ?? ["tr"]).filter(
      (d) => d !== "tr"
    );
    if (hedefDiller.length > 0) {
      const translations = await urunCevirisiOlustur(
        { isim, aciklama: aciklama || null },
        hedefDiller
      );
      if (Object.keys(translations).length > 0) {
        await adminDb.from("Urun").update({ translations }).eq("id", id);
      }
    }
  }

  return NextResponse.json({ urun: data });
}
