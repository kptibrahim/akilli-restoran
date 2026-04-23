import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";
import { Resend } from "resend";

function sifreUret(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ basarili: true });

    const temizEmail = String(email).trim().toLowerCase();

    // Kullanıcıyı bul (generateLink, email'in var olup olmadığını doğrular)
    const { data: linkData, error: linkError } = await adminDb.auth.admin.generateLink({
      type: "recovery",
      email: temizEmail,
      options: { redirectTo: "" },
    });

    if (linkError || !linkData?.user) {
      // Email kayıtlı değil ama güvenlik için aynı yanıtı dön
      return NextResponse.json({ basarili: true });
    }

    const yeniSifre = sifreUret();
    await adminDb.auth.admin.updateUserById(linkData.user.id, { password: yeniSifre });

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Gastronom AI <onboarding@resend.dev>",
      to: temizEmail,
      subject: "Gastronom AI — Yeni Şifreniz",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#141210;color:#F5EDD6;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:linear-gradient(135deg,#C89434,#E8B84B);border-radius:14px;margin-bottom:12px;">
              <span style="font-size:26px;font-weight:900;color:#0A0705;">G</span>
            </div>
            <h2 style="margin:0;color:#F5EDD6;letter-spacing:0.08em;">GASTRONOM <span style="color:#C89434;">AI</span></h2>
          </div>

          <h3 style="color:#C89434;margin-bottom:8px;">Şifre Sıfırlama</h3>
          <p style="color:#B8A882;margin-bottom:24px;">Hesabınız için yeni geçici şifreniz:</p>

          <div style="text-align:center;background:#1C1710;border:2px solid #C89434;border-radius:16px;padding:24px;margin-bottom:24px;">
            <span style="font-size:32px;font-weight:900;letter-spacing:0.2em;color:#E8B84B;">${yeniSifre}</span>
          </div>

          <p style="color:#8A7A5A;font-size:13px;text-align:center;">
            Bu şifreyle giriş yaptıktan sonra ayarlardan yeni bir şifre belirleyebilirsiniz.
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
