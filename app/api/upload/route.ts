import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const dosya = formData.get("dosya") as File | null;
  if (!dosya) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });

  const uzanti = dosya.name.split(".").pop() ?? "png";
  const yol = `urunler/${Date.now()}-${Math.random().toString(36).slice(2)}.${uzanti}`;
  const buffer = Buffer.from(await dosya.arrayBuffer());

  const { error } = await adminClient.storage
    .from("urun-gorselleri")
    .upload(yol, buffer, { contentType: dosya.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = adminClient.storage.from("urun-gorselleri").getPublicUrl(yol);
  return NextResponse.json({ url: data.publicUrl });
}
