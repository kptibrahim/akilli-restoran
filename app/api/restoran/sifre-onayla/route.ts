import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { token, yeniSifre } = await req.json();

    if (!token || !yeniSifre || yeniSifre.length < 8) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const { data: restoran, error } = await adminDb
      .from("Restoran")
      .select("userId, sifre_token_bitis")
      .eq("sifre_token", token)
      .single();

    if (error || !restoran) {
      return NextResponse.json({ error: "Geçersiz veya süresi dolmuş bağlantı" }, { status: 400 });
    }

    if (new Date(restoran.sifre_token_bitis) < new Date()) {
      return NextResponse.json({ error: "Bağlantının süresi dolmuş. Lütfen tekrar talep edin." }, { status: 400 });
    }

    const { error: sifreHata } = await adminDb.auth.admin.updateUserById(restoran.userId, {
      password: yeniSifre,
    });

    if (sifreHata) {
      return NextResponse.json({ error: "Şifre güncellenemedi" }, { status: 500 });
    }

    // Token'ı temizle
    await adminDb
      .from("Restoran")
      .update({ sifre_token: null, sifre_token_bitis: null })
      .eq("userId", restoran.userId);

    return NextResponse.json({ basarili: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
