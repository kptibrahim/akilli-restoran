import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { restoranId } = await req.json();

    // Kullanıcının bu restorana sahip olduğunu doğrula
    const { data: restoran } = await supabase
      .from("Restoran")
      .select("id, menuPdf")
      .eq("id", restoranId)
      .eq("userId", user.id)
      .single();

    if (!restoran?.menuPdf) {
      return NextResponse.json({ error: "PDF bulunamadı" }, { status: 404 });
    }

    // PDF'i Storage'dan indir
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("menu-pdfs")
      .download(`${restoranId}/menu.pdf`);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "PDF indirilemedi: " + downloadError?.message }, { status: 500 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Claude'a gönder — PDF dokümanı olarak
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Bu PDF bir restoran menüsü. İçindeki tüm kategorileri ve ürünleri çıkar.

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
- Fiyatları rakam olarak yaz (TL veya ₺ işareti olmadan)
- Türkçe karakterleri koru (ş, ğ, ü, ö, ç, ı)
- Sadece JSON döndür, markdown kod bloğu veya açıklama ekleme
- Fiyat okunamıyorsa 0 yaz`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "AI yanıt üretemedi" }, { status: 500 });
    }

    // JSON'u ayıkla (markdown bloğu içinde gelebilir)
    const jsonText = content.text.match(/\{[\s\S]*\}/)?.[0] ?? content.text;

    let menuVerisi: { kategoriler: Array<{ isim: string; urunler: Array<{ isim: string; aciklama?: string | null; fiyat: number }> }> };
    try {
      menuVerisi = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: "Menü ayrıştırılamadı", ham: content.text }, { status: 500 });
    }

    // Mevcut kategori sayısını al (yeni sıra başlangıcı için)
    const { count: mevcutSayisi } = await supabase
      .from("Kategori")
      .select("*", { count: "exact", head: true })
      .eq("restoranId", restoranId);

    let siraSayaci = mevcutSayisi ?? 0;
    let toplamUrun = 0;

    for (const kat of menuVerisi.kategoriler ?? []) {
      const { data: yeniKat, error: katError } = await supabase
        .from("Kategori")
        .insert({ restoranId, isim: kat.isim, sira: siraSayaci++ })
        .select()
        .single();

      if (katError || !yeniKat) continue;

      const urunler = (kat.urunler ?? []).map((u, i) => ({
        kategoriId: yeniKat.id,
        restoranId,
        isim: u.isim,
        aciklama: u.aciklama ?? null,
        fiyat: typeof u.fiyat === "number" ? u.fiyat : parseFloat(String(u.fiyat)) || 0,
        aktif: true,
        sira: i,
      }));

      if (urunler.length > 0) {
        await supabase.from("Urun").insert(urunler);
        toplamUrun += urunler.length;
      }
    }

    return NextResponse.json({
      basarili: true,
      kategoriSayisi: menuVerisi.kategoriler?.length ?? 0,
      urunSayisi: toplamUrun,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
