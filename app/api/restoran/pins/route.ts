import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const adminDb = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { pinKasiyer, pinMutfak } = await req.json();

    if (pinKasiyer != null && !/^\d{6}$/.test(pinKasiyer)) {
      return NextResponse.json({ error: "Kasiyer PIN 6 haneli sayı olmalı" }, { status: 400 });
    }
    if (pinMutfak != null && !/^\d{6}$/.test(pinMutfak)) {
      return NextResponse.json({ error: "Mutfak PIN 6 haneli sayı olmalı" }, { status: 400 });
    }

    const { error } = await adminDb
      .from("Restoran")
      .update({
        pin_kasiyer: pinKasiyer ?? null,
        pin_mutfak: pinMutfak ?? null,
      })
      .eq("userId", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ basarili: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
