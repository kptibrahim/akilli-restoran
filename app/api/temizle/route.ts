import { NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";

// Vercel Cron tarafından gece 03:00 UTC'de çağrılır.
// Siparis ve OdemeArsiv 24 saat, AnalitikKayit ve ChatLog 30 gün sonra silinir.
export async function GET() {
  const son24Saat = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const son30Gun  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  await Promise.all([
    adminDb.from("Siparis").delete().lt("createdAt", son24Saat),
    adminDb.from("OdemeArsiv").delete().lt("createdAt", son24Saat),
    adminDb.from("AnalitikKayit").delete().lt("createdAt", son30Gun),
    adminDb.from("ChatLog").delete().lt("createdAt", son30Gun),
  ]);

  return NextResponse.json({ ok: true, calistiAt: new Date().toISOString() });
}
