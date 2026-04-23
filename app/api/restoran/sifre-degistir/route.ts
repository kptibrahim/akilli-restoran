import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { adminDb } from "@/lib/supabase-admin";
import { Resend } from "resend";
import { randomBytes } from "crypto";

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const token = randomBytes(32).toString("hex");
    const bitis = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 dakika

    const { error: dbHata } = await adminDb
      .from("Restoran")
      .update({ sifre_token: token, sifre_token_bitis: bitis })
      .eq("userId", user.id);

    if (dbHata) return NextResponse.json({ error: "DB hatası" }, { status: 500 });

    const origin = _req.headers.get("origin") || "https://akilli-restoran.vercel.app";
    const link = `${origin}/auth/sifre-yenile?token=${token}`;

    const { data: restoran } = await adminDb
      .from("Restoran")
      .select("isim")
      .eq("userId", user.id)
      .single();

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Gastronom AI <onboarding@resend.dev>",
      to: user.email!,
      subject: "Gastronom AI — Şifre Değiştirme Onayı",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#141210;color:#F5EDD6;border-radius:16px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:linear-gradient(135deg,#C89434,#E8B84B);border-radius:14px;margin-bottom:12px;">
              <span style="font-size:26px;font-weight:900;color:#0A0705;">G</span>
            </div>
            <h2 style="margin:0;color:#F5EDD6;letter-spacing:0.08em;">GASTRONOM <span style="color:#C89434;">AI</span></h2>
          </div>

          <h3 style="color:#C89434;margin-bottom:8px;">Şifre Değiştirme Talebi</h3>
          <p style="color:#B8A882;margin-bottom:8px;">${restoran?.isim ?? "Restoranınız"} için bir şifre değiştirme talebi aldık.</p>
          <p style="color:#B8A882;margin-bottom:24px;">Onaylamak için aşağıdaki butona tıklayın. Bağlantı 30 dakika geçerlidir.</p>

          <div style="text-align:center;margin-bottom:24px;">
            <a href="${link}"
              style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#C89434,#E8B84B);color:#0A0705;font-weight:900;font-size:15px;border-radius:12px;text-decoration:none;letter-spacing:0.05em;">
              Şifremi Değiştir
            </a>
          </div>

          <p style="color:#8A7A5A;font-size:12px;text-align:center;">
            Bu talebi siz yapmadıysanız bu emaili görmezden gelin. Şifreniz değişmeyecektir.
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
