"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import Chatbot from "./Chatbot";
import Sepet from "./Sepet";
import type { Urun, Kategori, SepetItem, Translations } from "@/lib/types";
import { DIL_BAYRAK } from "@/lib/translate";

type Restoran = { id: string; slug: string; isim: string; renk: string; logo?: string | null };
type KategoriRow = Kategori & { sira: number; emoji?: string | null };

const MENU_UI: Record<string, {
  kategorilerBaslik: string;
  urunYok: string;
  geri: string;
  urunSayisi: (n: number) => string;
  garsonCagir: string;
  garsonBekliyor: string;
  garsonGeliyor: string;
  hesapIste: string;
  garsonCagirBtn: string;
  neYapmak: string;
  iptal: string;
  aciklama: string;
  icerik: string;
  alerjenler: string;
  sepeteEkle: string;
}> = {
  tr: {
    kategorilerBaslik: "Kategoriler", urunYok: "Bu kategoride ürün yok", geri: "Geri",
    urunSayisi: (n) => `${n} ürün`, garsonCagir: "Garson", garsonBekliyor: "Bekleniyor...",
    garsonGeliyor: "Garson Geliyor", hesapIste: "Hesap İste", garsonCagirBtn: "Garson Çağır",
    neYapmak: "Ne yapmak istersiniz?", iptal: "İptal",
    aciklama: "Açıklama", icerik: "İçerik", alerjenler: "Alerjenler", sepeteEkle: "Sepete Ekle",
  },
  en: {
    kategorilerBaslik: "Categories", urunYok: "No products in this category", geri: "Back",
    urunSayisi: (n) => `${n} items`, garsonCagir: "Waiter", garsonBekliyor: "Waiting...",
    garsonGeliyor: "On the way!", hesapIste: "Request Bill", garsonCagirBtn: "Call Waiter",
    neYapmak: "What do you need?", iptal: "Cancel",
    aciklama: "Description", icerik: "Ingredients", alerjenler: "Allergens", sepeteEkle: "Add to Cart",
  },
  ru: {
    kategorilerBaslik: "Категории", urunYok: "В этой категории нет товаров", geri: "Назад",
    urunSayisi: (n) => `${n} блюд`, garsonCagir: "Официант", garsonBekliyor: "Ожидание...",
    garsonGeliyor: "Официант идёт", hesapIste: "Счёт", garsonCagirBtn: "Позвать официанта",
    neYapmak: "Что вам нужно?", iptal: "Отмена",
    aciklama: "Описание", icerik: "Состав", alerjenler: "Аллергены", sepeteEkle: "В корзину",
  },
  de: {
    kategorilerBaslik: "Kategorien", urunYok: "Keine Produkte in dieser Kategorie", geri: "Zurück",
    urunSayisi: (n) => `${n} Gerichte`, garsonCagir: "Kellner", garsonBekliyor: "Warten...",
    garsonGeliyor: "Kommt!", hesapIste: "Rechnung", garsonCagirBtn: "Kellner rufen",
    neYapmak: "Was brauchen Sie?", iptal: "Abbrechen",
    aciklama: "Beschreibung", icerik: "Zutaten", alerjenler: "Allergene", sepeteEkle: "In den Warenkorb",
  },
  fr: {
    kategorilerBaslik: "Catégories", urunYok: "Aucun produit dans cette catégorie", geri: "Retour",
    urunSayisi: (n) => `${n} plats`, garsonCagir: "Serveur", garsonBekliyor: "En attente...",
    garsonGeliyor: "Il arrive!", hesapIste: "L'addition", garsonCagirBtn: "Appeler le serveur",
    neYapmak: "Que souhaitez-vous?", iptal: "Annuler",
    aciklama: "Description", icerik: "Ingrédients", alerjenler: "Allergènes", sepeteEkle: "Ajouter au panier",
  },
  es: {
    kategorilerBaslik: "Categorías", urunYok: "No hay productos en esta categoría", geri: "Volver",
    urunSayisi: (n) => `${n} platos`, garsonCagir: "Camarero", garsonBekliyor: "Esperando...",
    garsonGeliyor: "¡Ya viene!", hesapIste: "La cuenta", garsonCagirBtn: "Llamar al camarero",
    neYapmak: "¿Qué necesitas?", iptal: "Cancelar",
    aciklama: "Descripción", icerik: "Ingredientes", alerjenler: "Alérgenos", sepeteEkle: "Añadir al carrito",
  },
  it: {
    kategorilerBaslik: "Categorie", urunYok: "Nessun prodotto in questa categoria", geri: "Indietro",
    urunSayisi: (n) => `${n} piatti`, garsonCagir: "Cameriere", garsonBekliyor: "In attesa...",
    garsonGeliyor: "Sta arrivando!", hesapIste: "Il conto", garsonCagirBtn: "Chiama il cameriere",
    neYapmak: "Cosa desideri?", iptal: "Annulla",
    aciklama: "Descrizione", icerik: "Ingredienti", alerjenler: "Allergeni", sepeteEkle: "Aggiungi al carrello",
  },
  ar: {
    kategorilerBaslik: "الفئات", urunYok: "لا توجد منتجات في هذه الفئة", geri: "رجوع",
    urunSayisi: (n) => `${n} أطباق`, garsonCagir: "نادل", garsonBekliyor: "انتظار...",
    garsonGeliyor: "في الطريق!", hesapIste: "الحساب", garsonCagirBtn: "استدعاء النادل",
    neYapmak: "ماذا تريد؟", iptal: "إلغاء",
    aciklama: "الوصف", icerik: "المكونات", alerjenler: "مسببات الحساسية", sepeteEkle: "أضف إلى السلة",
  },
  zh: {
    kategorilerBaslik: "分类", urunYok: "此分类暂无商品", geri: "返回",
    urunSayisi: (n) => `${n} 道菜`, garsonCagir: "服务员", garsonBekliyor: "等待中...",
    garsonGeliyor: "来了!", hesapIste: "买单", garsonCagirBtn: "呼叫服务员",
    neYapmak: "您需要什么?", iptal: "取消",
    aciklama: "描述", icerik: "成分", alerjenler: "过敏原", sepeteEkle: "加入购物车",
  },
  ja: {
    kategorilerBaslik: "カテゴリー", urunYok: "このカテゴリーに商品はありません", geri: "戻る",
    urunSayisi: (n) => `${n} 品`, garsonCagir: "ウェイター", garsonBekliyor: "待機中...",
    garsonGeliyor: "向かっています!", hesapIste: "お会計", garsonCagirBtn: "ウェイターを呼ぶ",
    neYapmak: "何が必要ですか?", iptal: "キャンセル",
    aciklama: "説明", icerik: "材料", alerjenler: "アレルゲン", sepeteEkle: "カートに追加",
  },
  pt: {
    kategorilerBaslik: "Categorias", urunYok: "Sem produtos nesta categoria", geri: "Voltar",
    urunSayisi: (n) => `${n} pratos`, garsonCagir: "Garçom", garsonBekliyor: "Aguardando...",
    garsonGeliyor: "A caminho!", hesapIste: "A conta", garsonCagirBtn: "Chamar garçom",
    neYapmak: "O que você precisa?", iptal: "Cancelar",
    aciklama: "Descrição", icerik: "Ingredientes", alerjenler: "Alérgenos", sepeteEkle: "Adicionar ao carrinho",
  },
  ko: {
    kategorilerBaslik: "카테고리", urunYok: "이 카테고리에 제품이 없습니다", geri: "뒤로",
    urunSayisi: (n) => `${n} 메뉴`, garsonCagir: "웨이터", garsonBekliyor: "대기 중...",
    garsonGeliyor: "오고 있어요!", hesapIste: "계산서", garsonCagirBtn: "웨이터 호출",
    neYapmak: "무엇이 필요하세요?", iptal: "취소",
    aciklama: "설명", icerik: "재료", alerjenler: "알레르겐", sepeteEkle: "장바구니에 추가",
  },
  nl: {
    kategorilerBaslik: "Categorieën", urunYok: "Geen producten in deze categorie", geri: "Terug",
    urunSayisi: (n) => `${n} gerechten`, garsonCagir: "Ober", garsonBekliyor: "Wachten...",
    garsonGeliyor: "Komt eraan!", hesapIste: "De rekening", garsonCagirBtn: "Ober roepen",
    neYapmak: "Wat heeft u nodig?", iptal: "Annuleren",
    aciklama: "Beschrijving", icerik: "Ingrediënten", alerjenler: "Allergenen", sepeteEkle: "In winkelwagen",
  },
  pl: {
    kategorilerBaslik: "Kategorie", urunYok: "Brak produktów w tej kategorii", geri: "Wróć",
    urunSayisi: (n) => `${n} dań`, garsonCagir: "Kelner", garsonBekliyor: "Czekam...",
    garsonGeliyor: "Idzie!", hesapIste: "Rachunek", garsonCagirBtn: "Zawołaj kelnera",
    neYapmak: "Czego potrzebujesz?", iptal: "Anuluj",
    aciklama: "Opis", icerik: "Składniki", alerjenler: "Alergeny", sepeteEkle: "Dodaj do koszyka",
  },
  uk: {
    kategorilerBaslik: "Категорії", urunYok: "Немає товарів у цій категорії", geri: "Назад",
    urunSayisi: (n) => `${n} страв`, garsonCagir: "Офіціант", garsonBekliyor: "Очікування...",
    garsonGeliyor: "Вже йде!", hesapIste: "Рахунок", garsonCagirBtn: "Викликати офіціанта",
    neYapmak: "Що вам потрібно?", iptal: "Скасувати",
    aciklama: "Опис", icerik: "Склад", alerjenler: "Алергени", sepeteEkle: "Додати до кошика",
  },
};

function getUI(dil: string) {
  return MENU_UI[dil] ?? MENU_UI.en;
}

/** DB'deki translations objesinden ilgili dil verisini uygula */
function applyTranslations(kategoriler: KategoriRow[], dil: string): KategoriRow[] {
  if (dil === "tr") return kategoriler;
  return kategoriler.map((kat) => {
    const katTr = kat.translations?.[dil];
    return {
      ...kat,
      isim: katTr?.isim ?? kat.isim,
      urunler: kat.urunler.map((urun) => {
        const urunTr = (urun.translations as Translations | undefined)?.[dil];
        return {
          ...urun,
          isim: urunTr?.isim ?? urun.isim,
          aciklama: urunTr?.aciklama ?? urun.aciklama,
        };
      }),
    };
  });
}

export default function MenuClient({
  restoran,
  kategoriler: ilkKategoriler,
  masaNo: ilkMasaNo,
  dil = "tr",
  selectedLanguages,
}: {
  restoran: Restoran;
  kategoriler: KategoriRow[];
  masaNo?: string | null;
  dil?: string;
  dilIsim?: string; // artık kullanılmıyor, geriye dönük uyumluluk için
  selectedLanguages?: string[];
}) {
  const router = useRouter();
  const dilMenuRef = useRef<HTMLDivElement>(null);
  const aktifDilRef = useRef(dil);

  // Aktif diller — sadece restoran sahibinin seçtikleri
  const aktifDiller = selectedLanguages?.length ? selectedLanguages : ["tr"];

  // Türkçe kaynak (realtime güncellenir)
  const [kategoriler, setKategoriler] = useState<KategoriRow[]>(ilkKategoriler);
  // Aktif dil state (sayfa yenilemesi yok)
  const [aktifDil, setAktifDil] = useState(dil);

  // Gösterim verisi — translations kolonundan anında uygula
  const gorselKategoriler = applyTranslations(kategoriler, aktifDil);

  const [aktifKategori, setAktifKategori] = useState<string | null>(null);
  const [sepetAcik, setSepetAcik] = useState(false);
  const [sepet, setSepet] = useState<SepetItem[]>([]);
  const [garsonDurum, setGarsonDurum] = useState<null | "bekliyor" | "geliyor">(null);
  const [garsonCallId, setGarsonCallId] = useState<string | null>(null);
  const [garsonMenuAcik, setGarsonMenuAcik] = useState(false);
  const [dilMenuAcik, setDilMenuAcik] = useState(false);
  const [secilenUrun, setSecilenUrun] = useState<Urun | null>(null);


  useEffect(() => { aktifDilRef.current = aktifDil; }, [aktifDil]);

  // Browser history ile kategori navigasyonu — telefon geri tuşu çalışsın
  function kategoriSec(id: string | null) {
    if (id !== null) {
      window.history.pushState({ kategori: id }, "");
    }
    setAktifKategori(id);
    setSecilenUrun(null);
  }

  useEffect(() => {
    function onPopState() {
      setAktifKategori(null);
      setSecilenUrun(null);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Dil menüsü dışarı tıklanınca kapat
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dilMenuRef.current && !dilMenuRef.current.contains(e.target as Node)) {
        setDilMenuAcik(false);
      }
    }
    if (dilMenuAcik) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dilMenuAcik]);

  // Dil değiştirme — anında, sıfır API çağrısı
  function dilDegistir(yeniDil: string) {
    if (yeniDil === aktifDil) { setDilMenuAcik(false); return; }
    localStorage.setItem("gastronom_dil", yeniDil);
    localStorage.removeItem("gastronom_dil_isim");
    setAktifDil(yeniDil);
    setDilMenuAcik(false);
    const params = new URLSearchParams();
    if (ilkMasaNo) params.set("masa", ilkMasaNo);
    params.set("dil", yeniDil);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  // Realtime menü güncellemesi
  const handleMenuGuncelle = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from("Kategori")
      .select("*, urunler:Urun(*)")
      .eq("restoranId", restoran.id)
      .order("sira");
    if (!data) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yeniListe: KategoriRow[] = data.map((k: any) => ({
      id: k.id as string,
      isim: k.isim as string,
      sira: k.sira as number,
      emoji: k.emoji ?? null,
      translations: (k.translations ?? {}) as Translations,
      urunler: ((k.urunler ?? []) as any[])
        .filter((u) => u.aktif)
        .sort((a: any, b: any) => a.sira - b.sira)
        .map((u) => ({
          id: u.id, isim: u.isim, aciklama: u.aciklama ?? null,
          fiyat: u.fiyat, kalori: u.kalori ?? null, icerik: u.icerik ?? null,
          alerjenler: u.alerjenler ?? null, gorsel: u.gorsel ?? null,
          translations: (u.translations ?? {}) as Translations,
        })),
    }));
    setKategoriler(yeniListe);
    setAktifKategori((prev) =>
      prev === null ? null : (yeniListe.find((k) => k.id === prev) ? prev : null)
    );
  }, [restoran.id]);

  useEffect(() => {
    const supabase = createClient();
    const kanal = supabase
      .channel(`menu-${restoran.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "Urun" }, () => handleMenuGuncelle(supabase))
      .on("postgres_changes", { event: "*", schema: "public", table: "Kategori" }, () => handleMenuGuncelle(supabase))
      .subscribe();
    return () => { supabase.removeChannel(kanal); };
  }, [restoran.id, handleMenuGuncelle]);

  // Garson realtime + polling yedek
  useEffect(() => {
    if (!garsonCallId) return;
    const supabase = createClient();

    function onGeldi(idToDelete: string) {
      setGarsonDurum("geliyor");
      setTimeout(() => {
        setGarsonDurum(null);
        setGarsonCallId(null);
        fetch("/api/garson-cagir", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: idToDelete }),
        });
      }, 30000);
    }

    // Realtime
    const kanal = supabase
      .channel(`garson-${garsonCallId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "GarsonCagri", filter: `id=eq.${garsonCallId}` },
        (payload: { new: { durum: string } }) => {
          if (payload.new.durum === "geliyor") onGeldi(garsonCallId);
        })
      .subscribe();

    // Polling yedek: her 4 saniyede kontrol et
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("GarsonCagri")
          .select("durum")
          .eq("id", garsonCallId)
          .single();
        if (data?.durum === "geliyor") {
          clearInterval(interval);
          onGeldi(garsonCallId);
        } else if (!data) {
          // Kayıt silinmişse bekliyor ekranını kapat
          clearInterval(interval);
          setGarsonDurum(null);
          setGarsonCallId(null);
        }
      } catch { /* sessizce devam */ }
    }, 4000);

    return () => {
      supabase.removeChannel(kanal);
      clearInterval(interval);
    };
  }, [garsonCallId]);

  async function garsonCagir(tip: "garson" | "hesap") {
    if (garsonDurum !== null) return;
    setGarsonMenuAcik(false);
    const res = await fetch("/api/garson-cagir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoranId: restoran.id, masaNo: ilkMasaNo ?? "Bilinmiyor", tip }),
    });
    const data = (await res.json()) as { id?: string };
    if (data.id) { setGarsonDurum("bekliyor"); setGarsonCallId(data.id); }
  }

  function sepeteEkle(urun: Urun) {
    setSepet((prev) => {
      const mevcut = prev.find((i) => i.urun.id === urun.id);
      if (mevcut) return prev.map((i) => i.urun.id === urun.id ? { ...i, adet: i.adet + 1 } : i);
      return [...prev, { urun, adet: 1 }];
    });
  }

  function sepettenCikar(urun: Urun) {
    setSepet((prev) => {
      const mevcut = prev.find((i) => i.urun.id === urun.id);
      if (!mevcut || mevcut.adet <= 0) return prev;
      if (mevcut.adet === 1) return prev.filter((i) => i.urun.id !== urun.id);
      return prev.map((i) => i.urun.id === urun.id ? { ...i, adet: i.adet - 1 } : i);
    });
  }

  const ui = getUI(aktifDil);
  const sepetToplam = sepet.reduce((acc, i) => acc + i.urun.fiyat * i.adet, 0);
  const sepetAdet = sepet.reduce((acc, i) => acc + i.adet, 0);
  const aktifUrunler = aktifKategori
    ? (gorselKategoriler.find((k) => k.id === aktifKategori)?.urunler ?? [])
    : [];
  const aktifKategoriIsim = gorselKategoriler.find((k) => k.id === aktifKategori)?.isim ?? "";
  const dilInfo = DIL_BAYRAK[aktifDil];
  const dilLabel = dilInfo?.kisaltma ?? aktifDil.toUpperCase();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* Header */}
      <header
        className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 flex items-center justify-between"
        style={{ paddingTop: "max(env(safe-area-inset-top), 12px)", paddingBottom: "12px" }}
      >
        <div className="flex items-center gap-2">
          {aktifKategori !== null ? (
            <button
              onClick={() => kategoriSec(null)}
              className="flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: restoran.renk, touchAction: "manipulation" }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              <span className="max-w-[110px] truncate text-gray-800 text-xs">{aktifKategoriIsim}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center flex-shrink-0 bg-white"
                style={{ touchAction: "manipulation" }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <div>
                <span className="font-semibold text-gray-800 text-sm block truncate max-w-[120px]">{restoran.isim}</span>
                {ilkMasaNo && <span className="text-[10px] text-gray-400 leading-none">📍 {ilkMasaNo}</span>}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Dil seçici — sadece aktif diller, 2+ dil varsa göster */}
          {aktifDiller.length > 1 && (
            <div ref={dilMenuRef} className="relative">
              <button
                onClick={() => setDilMenuAcik((v) => !v)}
                className="px-2.5 h-7 rounded-full border-2 text-[11px] font-bold flex items-center gap-1"
                style={{ borderColor: restoran.renk, color: restoran.renk }}
              >
                {dilInfo?.bayrak && <span className="text-sm">{dilInfo.bayrak}</span>}
                {dilLabel}
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              {dilMenuAcik && (
                <div className="absolute right-0 top-9 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[160px]">
                  {aktifDiller.map((kod) => {
                    const info = DIL_BAYRAK[kod];
                    if (!info) return null;
                    return (
                      <button
                        key={kod}
                        onClick={() => dilDegistir(kod)}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left active:bg-gray-50"
                        style={aktifDil === kod ? { color: restoran.renk, fontWeight: 700 } : { color: "#374151" }}
                      >
                        <span className="text-base">{info.bayrak}</span>
                        <span>{info.isim}</span>
                        {aktifDil === kod && <span className="ml-auto text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Garson Çağır — sadece masa varsa */}
          {ilkMasaNo && <button
            onClick={() => garsonDurum === null && setGarsonMenuAcik(true)}
            disabled={garsonDurum !== null}
            className="h-7 px-2.5 rounded-full text-[10px] font-bold border-2 flex items-center gap-1 transition-colors"
            style={
              garsonDurum === "geliyor"
                ? { backgroundColor: "#22c55e", borderColor: "#22c55e", color: "white" }
                : garsonDurum === "bekliyor"
                ? { backgroundColor: "#ef4444", borderColor: "#ef4444", color: "white" }
                : { borderColor: "#e5e7eb", color: "#6b7280", backgroundColor: "white" }
            }
          >
            🔔
            <span className="max-w-[80px] truncate">
              {garsonDurum === "geliyor" ? ui.garsonGeliyor : garsonDurum === "bekliyor" ? ui.garsonBekliyor : ui.garsonCagir}
            </span>
          </button>}

        </div>
      </header>

      {/* KATEGORİ LİSTESİ */}
      {aktifKategori === null && (
        <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 100px)", touchAction: "pan-y" }}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{ui.kategorilerBaslik}</p>
          {gorselKategoriler.map((kat) => (
            <button key={kat.id} onClick={() => kategoriSec(kat.id)}
              style={{ touchAction: "manipulation" }}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-gray-200 bg-white active:scale-[0.98] transition-all text-left shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ backgroundColor: restoran.renk }}>
                  {kat.emoji ?? kat.isim[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{kat.isim}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ui.urunSayisi(kat.urunler.length)}</p>
                </div>
              </div>
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ))}

        </div>
      )}

      {/* ÜRÜN LİSTESİ */}
      {aktifKategori !== null && (
        <>
          <div className="bg-white border-b border-gray-100 px-4 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {gorselKategoriler.map((k) => (
                <button key={k.id} onClick={() => kategoriSec(k.id)}
                  className="h-7 px-3 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap flex-shrink-0"
                  style={aktifKategori === k.id
                    ? { backgroundColor: restoran.renk, color: "white", borderColor: restoran.renk }
                    : { backgroundColor: "white", color: "#666", borderColor: "#e0e0e0" }}>
                  {k.isim}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 100px)", touchAction: "pan-y" }}>
            {aktifUrunler.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-16">{ui.urunYok}</p>
            )}
            <div className="grid grid-cols-2 gap-3 p-3">
              {aktifUrunler.map((urun) => {
                const adet = sepet.find((i) => i.urun.id === urun.id)?.adet ?? 0;
                return (
                  <div key={urun.id}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
                    {/* Ürün detay alanı — ayrı button, iç içe değil */}
                    <button
                      className="flex flex-col text-left active:scale-[0.97] transition-transform"
                      style={{ touchAction: "manipulation" }}
                      onClick={() => setSecilenUrun(urun)}>
                      <div className="w-full aspect-square bg-gray-100 overflow-hidden">
                        {urun.gorsel
                          ? <img src={urun.gorsel} alt={urun.isim} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-50">🍽️</div>}
                      </div>
                      <div className="flex flex-col p-2.5 gap-1 w-full">
                        <h3 className="font-semibold text-gray-800 text-[12px] leading-snug line-clamp-2">{urun.isim}</h3>
                        {urun.aciklama && <p className="text-gray-400 text-[10px] leading-relaxed line-clamp-2">{urun.aciklama}</p>}
                        {urun.kalori && <p className="text-gray-300 text-[9px]">🔥 {urun.kalori} kal</p>}
                        <span className="font-bold text-gray-800 text-sm mt-1">{urun.fiyat.toFixed(0)} ₺</span>
                      </div>
                    </button>
                    {/* Sepet butonları — sadece masa varsa göster */}
                    {ilkMasaNo && (
                      <div className="flex items-center justify-end gap-1 px-2.5 pb-2.5">
                        {adet > 0 && (
                          <span className="text-xs font-bold w-4 text-center" style={{ color: restoran.renk }}>{adet}</span>
                        )}
                        <button onClick={() => sepeteEkle(urun)}
                          className="w-7 h-7 rounded-full text-white font-bold text-base flex items-center justify-center"
                          style={{ backgroundColor: restoran.renk, touchAction: "manipulation" }}>+</button>
                        <button onClick={() => sepettenCikar(urun)}
                          disabled={adet === 0}
                          className="w-7 h-7 rounded-full font-bold text-base flex items-center justify-center border-2 transition-opacity"
                          style={adet === 0
                            ? { borderColor: "#e5e7eb", color: "#d1d5db", opacity: 0.4, touchAction: "manipulation" }
                            : { borderColor: restoran.renk, color: restoran.renk, touchAction: "manipulation" }}>−</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Floating Sepet Butonu — sadece masa varsa */}
      {ilkMasaNo && <div
        className="fixed right-0 z-30 flex items-center"
        style={{
          bottom: "max(env(safe-area-inset-bottom), 100px)",
          transform: sepetAdet > 0 ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <button
          onClick={() => setSepetAcik(true)}
          className="flex flex-col items-center justify-between px-3 rounded-l-2xl shadow-lg text-white"
          style={{ backgroundColor: restoran.renk, paddingTop: "14px", paddingBottom: "14px", gap: "10px" }}
        >
          {/* Üst: restoran logosu */}
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
            {restoran.logo
              ? <img src={restoran.logo} alt={restoran.isim} className="w-full h-full object-cover" />
              : <span className="text-lg font-bold text-white">{restoran.isim[0]}</span>}
          </div>

          {/* Alt: sepet + adet */}
          <div className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span className="w-5 h-5 rounded-full bg-white text-[11px] font-bold flex items-center justify-center"
              style={{ color: restoran.renk }}>{sepetAdet}</span>
          </div>
        </button>
      </div>}

      {/* AI Asistan */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-20" style={{ pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
        <Chatbot
          restoranId={restoran.id}
          restoranIsim={restoran.isim}
          renk={restoran.renk}
          dil={aktifDil}
          dilIsim=""
          onUrunGoster={(urunId, kategoriId) => {
            const urun = gorselKategoriler.flatMap((k) => k.urunler).find((u) => u.id === urunId);
            kategoriSec(kategoriId);
            if (urun) setSecilenUrun(urun);
          }}
        />
        </div>
      </div>

      {/* Garson Popup */}
      {garsonMenuAcik && (
        <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[430px] left-1/2 -translate-x-1/2 w-full"
          onClick={() => setGarsonMenuAcik(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white w-full rounded-t-3xl px-5 pt-5 pb-6"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
            <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{ui.neYapmak}</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => garsonCagir("garson")}
                className="w-full rounded-2xl border-2 flex items-center gap-4 px-5 active:scale-[0.97] transition-transform"
                style={{ height: "72px", borderColor: restoran.renk, backgroundColor: `${restoran.renk}10` }}>
                <span className="text-3xl">🔔</span>
                <span className="text-base font-bold" style={{ color: restoran.renk }}>{ui.garsonCagirBtn}</span>
              </button>
              <button onClick={() => garsonCagir("hesap")}
                className="w-full rounded-2xl border-2 border-amber-400 flex items-center gap-4 px-5 active:scale-[0.97] transition-transform bg-amber-50"
                style={{ height: "72px" }}>
                <span className="text-3xl">💳</span>
                <span className="text-base font-bold text-amber-600">{ui.hesapIste}</span>
              </button>
              <button onClick={() => setGarsonMenuAcik(false)}
                className="w-full h-12 rounded-2xl bg-gray-100 text-gray-500 text-sm font-semibold">
                {ui.iptal}
              </button>
            </div>
          </div>
        </div>
      )}

      {sepetAcik && (
        <Sepet
          sepet={sepet}
          setSepet={setSepet}
          toplam={sepetToplam}
          renk={restoran.renk}
          restoranId={restoran.id}
          masaNo={ilkMasaNo ?? undefined}
          dil={aktifDil}
          onKapat={() => setSepetAcik(false)}
        />
      )}

      {/* Ürün Detay Modalı */}
      {secilenUrun && (
        <div className="fixed inset-0 z-40 flex items-end justify-center max-w-[430px] left-1/2 -translate-x-1/2 w-full"
          onClick={() => setSecilenUrun(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white w-full rounded-t-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()} style={{ maxHeight: "88vh" }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
            <div className="w-full aspect-[4/3] bg-gray-100 overflow-hidden">
              {secilenUrun.gorsel
                ? <img src={secilenUrun.gorsel} alt={secilenUrun.isim} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-7xl bg-gray-50">🍽️</div>}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "45vh", paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}>
              <div className="px-5 pt-4 pb-2">
                <h2 className="font-bold text-gray-900 text-lg leading-snug">{secilenUrun.isim}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-bold text-xl" style={{ color: restoran.renk }}>{secilenUrun.fiyat.toFixed(0)} ₺</span>
                  {secilenUrun.kalori && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">🔥 {secilenUrun.kalori} kal</span>
                  )}
                </div>
              </div>
              {secilenUrun.aciklama && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{ui.aciklama}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{secilenUrun.aciklama}</p>
                </div>
              )}
              {secilenUrun.icerik && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{ui.icerik}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{secilenUrun.icerik}</p>
                </div>
              )}
              {secilenUrun.alerjenler && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{ui.alerjenler}</p>
                  <p className="text-sm text-orange-600 leading-relaxed">⚠️ {secilenUrun.alerjenler}</p>
                </div>
              )}
              {ilkMasaNo && (
                <div className="px-5 pt-3 pb-1 border-t border-gray-100">
                  <button
                    onClick={() => { sepeteEkle(secilenUrun); setSecilenUrun(null); }}
                    className="w-full h-12 rounded-full text-white font-semibold text-sm flex items-center justify-center gap-2"
                    style={{ backgroundColor: restoran.renk }}>
                    <span>+</span>
                    <span>{ui.sepeteEkle}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
