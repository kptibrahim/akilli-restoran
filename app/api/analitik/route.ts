import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restoranId = searchParams.get("restoranId");
  const arsiv = searchParams.get("arsiv") === "true";
  const bas = searchParams.get("bas");

  if (!restoranId) return NextResponse.json({ error: "restoranId gerekli" }, { status: 400 });

  if (arsiv) {
    const [{ data: siparisler }, { data: chatLoglar }] = await Promise.all([
      adminDb.from("Siparis").select("*").eq("restoranId", restoranId).order("createdAt", { ascending: false }),
      adminDb.from("ChatLog").select("*").eq("restoranId", restoranId).order("createdAt", { ascending: false }).limit(1000),
    ]);
    return NextResponse.json({ siparisler: siparisler ?? [], chatLoglar: chatLoglar ?? [] });
  }

  let sipQuery = adminDb.from("Siparis").select("*").eq("restoranId", restoranId);
  let chatQuery = adminDb.from("ChatLog").select("*").eq("restoranId", restoranId);

  if (bas) {
    sipQuery = sipQuery.gte("createdAt", bas);
    chatQuery = chatQuery.gte("createdAt", bas);
  }

  const [{ data: siparisler }, { data: chatLoglar }] = await Promise.all([
    sipQuery.order("createdAt", { ascending: false }),
    chatQuery.order("createdAt", { ascending: false }).limit(20),
  ]);

  return NextResponse.json({ siparisler: siparisler ?? [], chatLoglar: chatLoglar ?? [] });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restoranId = searchParams.get("restoranId");
  if (!restoranId) return NextResponse.json({ error: "restoranId gerekli" }, { status: 400 });
  await adminDb.from("ChatLog").delete().eq("restoranId", restoranId);
  return NextResponse.json({ ok: true });
}
