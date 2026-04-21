"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type Props = {
  restoranId: string;
  mevcutPdf: string | null;
};

type Adim = "bos" | "yukluyor" | "analiz" | "tamam" | "hata";

export default function PdfUpload({ restoranId, mevcutPdf }: Props) {
  const supabase = createClient();
  const [adim, setAdim] = useState<Adim>(mevcutPdf ? "tamam" : "bos");
  const [hata, setHata] = useState("");
  const [sonuc, setSonuc] = useState<{ kategoriSayisi: number; urunSayisi: number } | null>(null);

  async function dosyaSec(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    if (!dosya) return;

    if (dosya.type !== "application/pdf") {
      setHata("Sadece PDF dosyası yükleyebilirsiniz.");
      return;
    }
    if (dosya.size > 10 * 1024 * 1024) {
      setHata("Dosya 10MB'dan küçük olmalıdır.");
      return;
    }

    setHata("");
    setSonuc(null);

    // 1. Storage'a yükle
    setAdim("yukluyor");
    const { error: uploadError } = await supabase.storage
      .from("menu-pdfs")
      .upload(`${restoranId}/menu.pdf`, dosya, { upsert: true });

    if (uploadError) {
      setHata("Yükleme hatası: " + uploadError.message);
      setAdim("hata");
      return;
    }

    // 2. Public URL'i Restoran kaydına yaz
    const { data: urlData } = supabase.storage
      .from("menu-pdfs")
      .getPublicUrl(`${restoranId}/menu.pdf`);

    await fetch(`/api/restoran/${restoranId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuPdf: urlData.publicUrl }),
    });

    // 3. AI analizi başlat
    setAdim("analiz");
    const res = await fetch("/api/menu/pdf-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoranId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setHata(data.error ?? "AI analiz başarısız.");
      setAdim("hata");
      return;
    }

    const data = await res.json();
    setSonuc({ kategoriSayisi: data.kategoriSayisi, urunSayisi: data.urunSayisi });
    setAdim("tamam");
  }

  async function pdfSil() {
    if (!confirm("PDF'i silmek istediğinize emin misiniz? Aktarılan menü öğeleri silinmez.")) return;

    await supabase.storage.from("menu-pdfs").remove([`${restoranId}/menu.pdf`]);
    await fetch(`/api/restoran/${restoranId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menuPdf: null }),
    });

    setSonuc(null);
    setAdim("bos");
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      <div>
        <h2 className="font-bold text-gray-700">PDF Menü → Otomatik Aktarım</h2>
        <p className="text-xs text-gray-400 mt-1">
          PDF yükleyin — yapay zeka okuyup menünüze otomatik ekler
        </p>
      </div>

      {/* Adım: Yükleniyor */}
      {adim === "yukluyor" && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-blue-700">PDF yükleniyor...</p>
        </div>
      )}

      {/* Adım: AI Analiz */}
      {adim === "analiz" && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-700">Yapay zeka menüyü okuyor...</p>
            <p className="text-xs text-orange-500 mt-0.5">Bu 10-20 saniye sürebilir</p>
          </div>
        </div>
      )}

      {/* Adım: Tamamlandı */}
      {adim === "tamam" && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-700">Menü başarıyla aktarıldı!</p>
            {sonuc && (
              <p className="text-xs text-green-600 mt-1">
                {sonuc.kategoriSayisi} kategori, {sonuc.urunSayisi} ürün eklendi
              </p>
            )}
            {!sonuc && (
              <p className="text-xs text-green-600 mt-1">Menü editöründen kontrol edin</p>
            )}
          </div>
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <span className="block w-full bg-orange-500 text-white text-sm text-center py-2.5 rounded-xl font-semibold">
                Yeni PDF Yükle (Güncelle)
              </span>
              <input type="file" accept="application/pdf" className="hidden" onChange={dosyaSec} />
            </label>
            <button
              onClick={pdfSil}
              className="px-4 py-2.5 border border-red-200 text-red-500 text-sm rounded-xl hover:bg-red-50"
            >
              Sil
            </button>
          </div>
        </div>
      )}

      {/* Adım: Boş veya Hata */}
      {(adim === "bos" || adim === "hata") && (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-sm text-gray-500">PDF menünüzü yükleyin</p>
            <p className="text-xs text-gray-400 mt-1">AI okuyup dijital menüye otomatik aktarır</p>
          </div>
          <label className="cursor-pointer block">
            <span className="block w-full text-center py-3 rounded-xl font-semibold text-sm bg-orange-500 text-white">
              PDF Seç ve Aktar
            </span>
            <input type="file" accept="application/pdf" className="hidden" onChange={dosyaSec} />
          </label>
        </div>
      )}

      {hata && <p className="text-red-500 text-xs">{hata}</p>}
    </div>
  );
}
