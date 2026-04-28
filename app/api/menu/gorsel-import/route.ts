import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { limitKontrol, kayitEkle } from "@/lib/ai-kullanim";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const formData = await req.formData();
    const gorsel = formData.get("gorsel") as File | null;
    const restoranId = formData.get("restoranId") as string | null;

    if (!gorsel || !restoranId) {
      return NextResponse.json({ error: "Görsel ve restoranId gerekli" }, { status: 400 });
    }

    // Paket kontrolü
    const kullanim = await limitKontrol(restoranId, "import");
    if (!kullanim.izinVar) {
      return NextResponse.json({
        error: kullanim.limit === 0
          ? "AI Menü Import bu pakette mevcut değil"
          : "Aylık AI menü import limitiniz doldu",
        kullanildi: kullanim.kullanildi,
        limit: kullanim.limit,
        paket: kullanim.paket,
        upgradeUrl: "/dashboard/abonelik",
      }, { status: 402 });
    }

    const izinliTipler = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!izinliTipler.includes(gorsel.type)) {
      return NextResponse.json({ error: "Sadece JPG, PNG veya WEBP yükleyebilirsiniz." }, { status: 400 });
    }
    if (gorsel.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Görsel 20MB'dan küçük olmalı." }, { status: 400 });
    }

    const arrayBuffer = await gorsel.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = gorsel.type as "image/jpeg" | "image/png" | "image/webp";

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Bu görsel bir restoran menüsü. Görseldeki tüm kategorileri ve ürünleri çıkar.

Şu JSON formatında döndür, başka hiçbir şey yazma:
{
  "kategoriler": [
    {
      "isim": "Kategori Adı",
      "urunler": [
        {
          "isim": "Ürün Adı",
          "aciklama": "Açıklama varsa yaz, yoksa null",
          "fiyat": 50
        }
      ]
    }
  ]
}

Kurallar:
- Fiyatları sayı olarak yaz (TL veya ₺ işareti olmadan)
- Türkçe karakterleri koru (ş, ğ, ü, ö, ç, ı)
- Sadece JSON döndür, markdown kod bloğu veya açıklama ekleme
- Fiyat okunamazsa 0 yaz
- Ürün adı ya da kategori adı yoksa atla`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "AI yanıt üretemedi" }, { status: 500 });
    }

    const jsonText = content.text.match(/\{[\s\S]*\}/)?.[0] ?? content.text;

    let menuVerisi: {
      kategoriler: Array<{
        isim: string;
        urunler: Array<{ isim: string; aciklama?: string | null; fiyat: number }>;
      }>;
    };
    try {
      menuVerisi = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: "Menü ayrıştırılamadı", ham: content.text }, { status: 500 });
    }

    const usage = response.usage as { input_tokens: number; output_tokens: number };
    kayitEkle({
      restoranId,
      tip: "import",
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      model: "sonnet-4-6",
    }).catch(() => {});

    return NextResponse.json({ kategoriler: menuVerisi.kategoriler ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Onaylanan menüyü DB'ye kaydet
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { restoranId, kategoriler } = await req.json();
    if (!restoranId || !kategoriler) {
      return NextResponse.json({ error: "Eksik veri" }, { status: 400 });
    }

    const { count: mevcutSayisi } = await db
      .from("Kategori")
      .select("*", { count: "exact", head: true })
      .eq("restoranId", restoranId);

    let siraSayaci = mevcutSayisi ?? 0;
    let toplamUrun = 0;

    for (const kat of kategoriler) {
      if (!kat.isim?.trim() || !kat.urunler?.length) continue;

      const katId = crypto.randomUUID();
      const { error: katError } = await db
        .from("Kategori")
        .insert({ id: katId, restoranId, isim: kat.isim.trim(), sira: siraSayaci++ });

      if (katError) continue;

      const urunler = (kat.urunler as Array<{ isim: string; aciklama?: string | null; fiyat: number }>)
        .filter((u) => u.isim?.trim())
        .map((u, i) => ({
          id: crypto.randomUUID(),
          kategoriId: katId,
          isim: u.isim.trim(),
          aciklama: u.aciklama?.trim() || null,
          fiyat: typeof u.fiyat === "number" ? u.fiyat : parseFloat(String(u.fiyat)) || 0,
          aktif: true,
          sira: i,
        }));

      if (urunler.length > 0) {
        await db.from("Urun").insert(urunler);
        toplamUrun += urunler.length;
      }
    }

    return NextResponse.json({
      basarili: true,
      kategoriSayisi: kategoriler.length,
      urunSayisi: toplamUrun,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
