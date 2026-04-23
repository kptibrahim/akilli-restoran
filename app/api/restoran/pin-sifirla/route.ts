import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const adminDb = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ROL_KOLON: Record<string, string> = {
  yonetici: "pin_yonetici",
  kasiyer: "pin_kasiyer",
  mutfak: "pin_mutfak",
};

const ROL_ISIM: Record<string, string> = {
  yonetici: "Yönetici",
  kasiyer: "Kasiyer",
  mutfak: "Mutfak",
};

export async function POST(req: NextRequest) {
  try {
    const { restoranId, rol } = await req.json();

    if (!restoranId || !rol || !ROL_KOLON[rol]) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    // Restoranı ve sahibinin userId'sini al
    const { data: restoran, error: restoranHata } = await adminDb
      .from("Restoran")
      .select("isim, userId")
      .eq("id", restoranId)
      .single();

    if (restoranHata || !restoran) {
      return NextResponse.json({ error: "Restoran bulunamadı" }, { status: 404 });
    }

    // Kullanıcının emailini al
    const { data: { user }, error: userHata } = await adminDb.auth.admin.getUserById(restoran.userId);
    if (userHata || !user?.email) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Yeni 6 haneli PIN oluştur
    const yeniPin = String(Math.floor(100000 + Math.random() * 900000));

    // DB'yi güncelle
    const kolon = ROL_KOLON[rol];
    const { error: guncelleHata } = await adminDb
      .from("Restoran")
      .update({ [kolon]: yeniPin })
      .eq("id", restoranId);

    if (guncelleHata) {
      return NextResponse.json({ error: "PIN güncellenemedi" }, { status: 500 });
    }

    // Email gönder
    const resend = new Resend(process.env.RESEND_API_KEY);
    const rolIsim = ROL_ISIM[rol];

    await resend.emails.send({
      from: "Gastronom AI <onboarding@resend.dev>",
      to: user.email,
      subject: `${restoran.isim} — ${rolIsim} PIN Sıfırlama`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#141210;color:#F5EDD6;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:linear-gradient(135deg,#C89434,#E8B84B);border-radius:14px;margin-bottom:12px;">
              <span style="font-size:26px;font-weight:900;color:#0A0705;">G</span>
            </div>
            <h2 style="margin:0;color:#F5EDD6;letter-spacing:0.08em;">GASTRONOM <span style="color:#C89434;">AI</span></h2>
          </div>

          <h3 style="color:#C89434;margin-bottom:8px;">${rolIsim} PIN Sıfırlama</h3>
          <p style="color:#B8A882;margin-bottom:24px;">${restoran.isim} için yeni ${rolIsim} PIN kodunuz:</p>

          <div style="text-align:center;background:#1C1710;border:2px solid #C89434;border-radius:16px;padding:24px;margin-bottom:24px;">
            <span style="font-size:40px;font-weight:900;letter-spacing:0.25em;color:#E8B84B;">${yeniPin}</span>
          </div>

          <p style="color:#8A7A5A;font-size:13px;text-align:center;">
            Bu PIN'i giriş ekranında kullanın. Güvenliğiniz için lütfen yeni bir PIN belirleyin.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ basarili: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
