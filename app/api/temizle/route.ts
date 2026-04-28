import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";

// Vercel Cron tarafından gece 00:00 UTC (Türkiye 03:00) tetiklenir.
// Siparis ve OdemeArsiv 24 saat, AnalitikKayit ve ChatLog 30 gün sonra silinir.
export async function GET(req: NextRequest) {
  // CRON_SECRET her zaman zorunlu — tanımlı değilse de erişimi engelle
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const son24Saat = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const son30Gun  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: restoranlar } = await adminDb
    .from("Restoran")
    .select("id, timezone");

  let islenen = 0;
  for (const restoran of (restoranlar ?? [])) {
    const _tz = (restoran.timezone as string | null) ?? "Europe/Istanbul";
    // İlerideki timezone-aware kontrol için:
    // const yerelSaat = new Intl.DateTimeFormat("en-US", { timeZone: _tz, hour: "numeric", hour12: false }).format(new Date());
    // if (Number(yerelSaat) !== 3) continue; // her restoranın yerel 03:00'ında sil

    await Promise.all([
      adminDb.from("Siparis").delete().eq("restoranId", restoran.id).lt("createdAt", son24Saat),
      adminDb.from("OdemeArsiv").delete().eq("restoranId", restoran.id).lt("createdAt", son24Saat),
    ]);
    islenen++;
  }

  // 30 günlük temizlik (timezone bağımsız — UTC bazlı yeterli)
  await Promise.all([
    adminDb.from("AnalitikKayit").delete().lt("createdAt", son30Gun),
    adminDb.from("ChatLog").delete().lt("createdAt", son30Gun),
  ]);

  return NextResponse.json({ ok: true, calistiAt: new Date().toISOString(), islenen });
}
