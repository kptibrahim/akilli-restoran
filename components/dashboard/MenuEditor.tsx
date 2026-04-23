"use client";

import { useState, useRef } from "react";

type Urun = {
  id: string; isim: string; aciklama: string | null; fiyat: number;
  kalori: number | null; icerik: string | null; alerjenler: string | null;
  gorsel: string | null; aktif: boolean;
};
type Kategori = { id: string; isim: string; emoji: string | null; urunler: Urun[] };
const BOS_URUN = { isim: "", aciklama: "", fiyat: "", kalori: "", icerik: "", alerjenler: "", gorsel: "", kategoriId: "" };

const EMOJILER = [
  "🍕","🍔","🌮","🌯","🥗","🍜","🍝","🍛","🍣","🍱",
  "🥩","🍗","🥪","🧆","🥙","🫔","🍲","🥘","🫕","🍤",
  "🥐","🥞","🍳","🥚","🧇","🥖","🥨","🧀",
  "🍰","🎂","🧁","🍩","🍪","🍫","🍦","🍨","🍧",
  "🧋","🥤","☕","🍷","🍺","🥂","🫖","🍵","🧃",
  "🦞","🦀","🦑","🐟","🍤",
  "🥕","🥦","🫑","🥑","🍅",
  "🍽️","⭐","🔥","✨","🎯",
];

const KIRP_BOYUT = 300;

type KirpState = {
  dosya: File;
  imgUrl: string;
  imgEl: HTMLImageElement;
  displayW: number;
  displayH: number;
  minX: number;
  minY: number;
};

function EmojiSecici({ secili, onSec, onKapat }: { secili: string; onSec: (e: string) => void; onKapat: () => void }) {
  return (
    <div className="absolute z-50 top-full left-0 mt-1 p-2 rounded-2xl shadow-2xl"
      style={{ background: "var(--ast-modal-bg)", border: "1px solid var(--ast-card-border)", width: 220 }}>
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJILER.map((e) => (
          <button key={e} onClick={() => { onSec(e); onKapat(); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-base hover:scale-110 transition-transform"
            style={secili === e ? { background: "var(--ast-nav-active-bg)" } : {}}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MenuEditor({ restoranId, kategoriler: ilkKategoriler }: { restoranId: string; kategoriler: Kategori[] }) {
  const [kategoriler, setKategoriler] = useState<Kategori[]>(ilkKategoriler);
  const [aktifKat, setAktifKat] = useState<string | null>(ilkKategoriler[0]?.id ?? null);
  const [yeniKatIsim, setYeniKatIsim] = useState("");
  const [yeniKatEmoji, setYeniKatEmoji] = useState("🍽️");
  const [yeniKatEmojiAcik, setYeniKatEmojiAcik] = useState(false);
  const [katEklemeAcik, setKatEklemeAcik] = useState(false);
  const [emojiDegistirKatId, setEmojiDegistirKatId] = useState<string | null>(null);
  const [urunModal, setUrunModal] = useState<{ mod: "ekle" | "duzenle"; urun?: Urun } | null>(null);
  const [urunForm, setUrunForm] = useState(BOS_URUN);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gorselYukleniyor, setGorselYukleniyor] = useState(false);
  const dosyaInputRef = useRef<HTMLInputElement>(null);

  const [kirpModal, setKirpModal] = useState<KirpState | null>(null);
  const kirpImgRef = useRef<HTMLDivElement>(null);
  const kirpOffset = useRef({ x: 0, y: 0 });
  const kirpDrag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  async function uploadDosya(dosyaVeyaBlob: File | Blob, isim?: string) {
    setGorselYukleniyor(true);
    const form = new FormData();
    const obj = dosyaVeyaBlob instanceof File
      ? dosyaVeyaBlob
      : new File([dosyaVeyaBlob], isim ?? "gorsel.jpg", { type: "image/jpeg" });
    form.append("dosya", obj);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (json.error) alert("Görsel yüklenemedi: " + json.error);
    else setUrunForm((f) => ({ ...f, gorsel: json.url }));
    setGorselYukleniyor(false);
  }

  async function gorselSec(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    e.target.value = "";

    const imgUrl = URL.createObjectURL(dosya);
    const imgEl = await new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = imgUrl;
    });

    if (Math.abs(imgEl.width - imgEl.height) <= 2) {
      URL.revokeObjectURL(imgUrl);
      await uploadDosya(dosya);
      return;
    }

    const scale = KIRP_BOYUT / Math.min(imgEl.width, imgEl.height);
    const displayW = Math.round(imgEl.width * scale);
    const displayH = Math.round(imgEl.height * scale);
    kirpOffset.current = { x: 0, y: 0 };
    setKirpModal({
      dosya, imgUrl, imgEl, displayW, displayH,
      minX: -(displayW - KIRP_BOYUT),
      minY: -(displayH - KIRP_BOYUT),
    });
  }

  function kirpDragBasla(clientX: number, clientY: number) {
    kirpDrag.current = { startX: clientX, startY: clientY, ox: kirpOffset.current.x, oy: kirpOffset.current.y };
  }

  function kirpDragHareket(clientX: number, clientY: number) {
    if (!kirpDrag.current || !kirpModal) return;
    const dx = clientX - kirpDrag.current.startX;
    const dy = clientY - kirpDrag.current.startY;
    const newX = Math.min(0, Math.max(kirpModal.minX, kirpDrag.current.ox + dx));
    const newY = Math.min(0, Math.max(kirpModal.minY, kirpDrag.current.oy + dy));
    kirpOffset.current = { x: newX, y: newY };
    if (kirpImgRef.current) kirpImgRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
  }

  function kirpDragBitir() {
    kirpDrag.current = null;
  }

  async function kirpVeYukle() {
    if (!kirpModal) return;
    const { imgEl, dosya, minX, minY } = kirpModal;
    const scale = KIRP_BOYUT / Math.min(imgEl.width, imgEl.height);
    const cx = Math.min(0, Math.max(minX, kirpOffset.current.x));
    const cy = Math.min(0, Math.max(minY, kirpOffset.current.y));
    const srcX = (-cx) / scale;
    const srcY = (-cy) / scale;
    const srcSize = KIRP_BOYUT / scale;

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    canvas.getContext("2d")!.drawImage(imgEl, srcX, srcY, srcSize, srcSize, 0, 0, 800, 800);

    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92));
    const isim = dosya.name.replace(/\.[^.]+$/, ".jpg");
    URL.revokeObjectURL(kirpModal.imgUrl);
    setKirpModal(null);
    await uploadDosya(blob, isim);
  }

  async function kategoriEkle() {
    const isim = yeniKatIsim.trim();
    if (!isim) return;
    setYukleniyor(true);
    const res = await fetch("/api/menu", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tip: "kategori", restoranId, isim, emoji: yeniKatEmoji, sira: kategoriler.length }),
    });
    const json = await res.json();
    if (json.error || !json.kategori) { alert("Kategori eklenemedi: " + (json.error ?? "Bilinmeyen hata")); setYukleniyor(false); return; }
    setKategoriler((prev) => [...prev, { ...json.kategori, urunler: [] }]);
    setAktifKat(json.kategori.id);
    setYeniKatIsim(""); setYeniKatEmoji("🍽️"); setKatEklemeAcik(false); setYukleniyor(false);
  }

  async function kategoriSil(katId: string) {
    if (!confirm("Bu kategoriyi ve tüm ürünlerini silmek istediğinden emin misin?")) return;
    await fetch(`/api/menu?kategoriId=${katId}`, { method: "DELETE" });
    const kalan = kategoriler.filter((k) => k.id !== katId);
    setKategoriler(kalan);
    setAktifKat(kalan[0]?.id ?? null);
  }

  async function emojiGuncelle(katId: string, emoji: string) {
    setKategoriler((prev) => prev.map((k) => k.id === katId ? { ...k, emoji } : k));
    setEmojiDegistirKatId(null);
    await fetch("/api/menu", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kategoriId: katId, emoji }),
    });
  }

  function urunEkleAc() {
    setUrunForm({ ...BOS_URUN, kategoriId: aktifKat ?? kategoriler[0]?.id ?? "" });
    setUrunModal({ mod: "ekle" });
  }

  function urunDuzenleAc(urun: Urun, katId: string) {
    setUrunForm({
      isim: urun.isim, aciklama: urun.aciklama ?? "", fiyat: String(urun.fiyat),
      kalori: urun.kalori ? String(urun.kalori) : "", icerik: urun.icerik ?? "",
      alerjenler: urun.alerjenler ?? "", gorsel: urun.gorsel ?? "", kategoriId: katId,
    });
    setUrunModal({ mod: "duzenle", urun });
  }

  async function urunKaydet() {
    if (!urunForm.isim.trim() || !urunForm.fiyat || !urunForm.kategoriId) return;
    setYukleniyor(true);
    if (urunModal?.mod === "ekle") {
      const hedefKat = kategoriler.find((k) => k.id === urunForm.kategoriId);
      const sira = hedefKat?.urunler.length ?? 0;
      const res = await fetch("/api/menu", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tip: "urun", kategoriId: urunForm.kategoriId, isim: urunForm.isim, aciklama: urunForm.aciklama || null, fiyat: urunForm.fiyat, kalori: urunForm.kalori || null, icerik: urunForm.icerik || null, alerjenler: urunForm.alerjenler || null, gorsel: urunForm.gorsel || null, sira, aktif: true }),
      });
      const json = await res.json();
      if (json.error || !json.urun) { alert("Ürün eklenemedi: " + (json.error ?? "Bilinmeyen hata")); setYukleniyor(false); return; }
      setKategoriler((prev) => prev.map((k) => k.id === urunForm.kategoriId ? { ...k, urunler: [...k.urunler, json.urun] } : k));
      setAktifKat(urunForm.kategoriId);
    } else if (urunModal?.mod === "duzenle" && urunModal.urun) {
      const res = await fetch(`/api/menu/${urunModal.urun.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isim: urunForm.isim, aciklama: urunForm.aciklama || null, fiyat: urunForm.fiyat, kalori: urunForm.kalori || null, icerik: urunForm.icerik || null, alerjenler: urunForm.alerjenler || null, gorsel: urunForm.gorsel || null }),
      });
      const json = await res.json();
      if (json.error) { alert("Ürün güncellenemedi: " + json.error); setYukleniyor(false); return; }
      setKategoriler((prev) => prev.map((k) => ({ ...k, urunler: k.urunler.map((u) => u.id === urunModal.urun!.id ? { ...u, isim: urunForm.isim, aciklama: urunForm.aciklama || null, fiyat: parseFloat(urunForm.fiyat), kalori: urunForm.kalori ? parseInt(urunForm.kalori) : null, icerik: urunForm.icerik || null, alerjenler: urunForm.alerjenler || null, gorsel: urunForm.gorsel || null } : u) })));
    }
    setUrunModal(null); setYukleniyor(false);
  }

  async function urunSil(urunId: string) {
    if (!confirm("Bu ürünü silmek istediğinden emin misin?")) return;
    await fetch(`/api/menu?urunId=${urunId}`, { method: "DELETE" });
    setKategoriler((prev) => prev.map((k) => ({ ...k, urunler: k.urunler.filter((u) => u.id !== urunId) })));
  }

  const aktifUrunler = kategoriler.find((k) => k.id === aktifKat)?.urunler ?? [];

  const inputStyle = {
    width: "100%", background: "var(--ast-input-bg)", border: "1px solid var(--ast-input-border)",
    color: "var(--ast-input-text)", borderRadius: 12, padding: "10px 12px", fontSize: 14, outline: "none",
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--ast-bg)" }}
      onClick={() => { setEmojiDegistirKatId(null); setYeniKatEmojiAcik(false); }}>
      {/* Header */}
      <div className="px-4 py-3.5 flex items-center justify-between shrink-0"
        style={{ background: "var(--ast-sidebar-bg)", borderBottom: "1px solid var(--ast-divider)" }}>
        <h1 className="text-base font-bold" style={{ color: "var(--ast-text1)" }}>Menü Editörü</h1>
        {kategoriler.length > 0 && (
          <button onClick={urunEkleAc}
            className="md:hidden px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
            + Ürün Ekle
          </button>
        )}
      </div>

      {/* Mobil: Kategori scroll */}
      <div className="md:hidden px-4 py-3 flex items-center gap-2 overflow-x-auto"
        style={{ background: "var(--ast-sidebar-bg)", borderBottom: "1px solid var(--ast-divider)" }}>
        <div className="flex gap-2 shrink-0">
          {kategoriler.map((k) => (
            <button key={k.id} onClick={() => setAktifKat(k.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1"
              style={aktifKat === k.id
                ? { background: "var(--ast-gold)", color: "#0A0705" }
                : { background: "var(--ast-badge-bg)", color: "var(--ast-text2)", border: "1px solid var(--ast-divider)" }}>
              <span>{k.emoji ?? "🍽️"}</span>
              <span>{k.isim}</span>
            </button>
          ))}
          <button onClick={(e) => { e.stopPropagation(); setKatEklemeAcik(true); }}
            className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
            style={{ border: "1px dashed var(--ast-gold)", color: "var(--ast-gold)", background: "transparent" }}>
            + Ekle
          </button>
        </div>
      </div>

      {katEklemeAcik && (
        <div className="md:hidden px-4 py-3 flex gap-2 items-center"
          style={{ background: "var(--ast-sidebar-bg)", borderBottom: "1px solid var(--ast-divider)" }}
          onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <button onClick={() => setYeniKatEmojiAcik((v) => !v)}
              className="w-9 h-9 rounded-xl text-xl flex items-center justify-center"
              style={{ background: "var(--ast-icon-bg)", border: "1px solid var(--ast-divider)" }}>
              {yeniKatEmoji}
            </button>
            {yeniKatEmojiAcik && (
              <EmojiSecici secili={yeniKatEmoji} onSec={setYeniKatEmoji} onKapat={() => setYeniKatEmojiAcik(false)} />
            )}
          </div>
          <input autoFocus value={yeniKatIsim} onChange={(e) => setYeniKatIsim(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && kategoriEkle()}
            placeholder="Kategori adı" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={kategoriEkle} disabled={yukleniyor}
            className="px-3 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: "var(--ast-gold)", color: "#0A0705" }}>Ekle</button>
          <button onClick={() => { setKatEklemeAcik(false); setYeniKatIsim(""); }}
            className="px-3 rounded-lg text-xs"
            style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text2)" }}>İptal</button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sol — Kategori Listesi (masaüstü) */}
        <div className="hidden md:flex w-52 flex-col flex-shrink-0"
          style={{ background: "var(--ast-sidebar-bg)", borderRight: "1px solid var(--ast-divider)" }}>
          <div className="p-3" style={{ borderBottom: "1px solid var(--ast-divider)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ast-text3)" }}>Kategoriler</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {kategoriler.length === 0 && (
              <p className="text-xs text-center p-4" style={{ color: "var(--ast-text3)" }}>Henüz kategori yok</p>
            )}
            {kategoriler.map((k) => (
              <div key={k.id}
                className="flex items-center justify-between px-3 py-3 cursor-pointer group"
                style={aktifKat === k.id
                  ? { background: "var(--ast-nav-active-bg)", borderLeft: "2px solid var(--ast-nav-active-border)" }
                  : { borderBottom: "1px solid var(--ast-divider)" }}
                onClick={() => setAktifKat(k.id)}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEmojiDegistirKatId(emojiDegistirKatId === k.id ? null : k.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-base hover:scale-110 transition-transform"
                      title="Emoji değiştir"
                      style={{ background: "var(--ast-icon-bg)" }}>
                      {k.emoji ?? "🍽️"}
                    </button>
                    {emojiDegistirKatId === k.id && (
                      <EmojiSecici
                        secili={k.emoji ?? "🍽️"}
                        onSec={(e) => emojiGuncelle(k.id, e)}
                        onKapat={() => setEmojiDegistirKatId(null)}
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium truncate"
                    style={{ color: aktifKat === k.id ? "var(--ast-nav-active-color)" : "var(--ast-text1)" }}>
                    {k.isim}
                  </span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); kategoriSil(k.id); }}
                  className="hidden group-hover:flex w-5 h-5 items-center justify-center text-xs flex-shrink-0"
                  style={{ color: "var(--ast-error-text)" }}>✕</button>
              </div>
            ))}
          </div>
          <div className="p-3" style={{ borderTop: "1px solid var(--ast-divider)" }}>
            {katEklemeAcik ? (
              <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button onClick={() => setYeniKatEmojiAcik((v) => !v)}
                      className="w-9 h-9 rounded-xl text-xl flex items-center justify-center"
                      style={{ background: "var(--ast-icon-bg)", border: "1px solid var(--ast-divider)" }}>
                      {yeniKatEmoji}
                    </button>
                    {yeniKatEmojiAcik && (
                      <EmojiSecici secili={yeniKatEmoji} onSec={setYeniKatEmoji} onKapat={() => setYeniKatEmojiAcik(false)} />
                    )}
                  </div>
                  <p className="text-xs" style={{ color: "var(--ast-text3)" }}>İkon seç</p>
                </div>
                <input autoFocus value={yeniKatIsim} onChange={(e) => setYeniKatIsim(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && kategoriEkle()}
                  placeholder="Kategori adı" style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }} />
                <div className="flex gap-1">
                  <button onClick={kategoriEkle} disabled={yukleniyor || !yeniKatIsim.trim()}
                    className="flex-1 rounded-lg py-1.5 text-xs font-medium disabled:opacity-50"
                    style={{ background: "var(--ast-gold)", color: "#0A0705" }}>
                    {yukleniyor ? "..." : "Ekle"}
                  </button>
                  <button onClick={() => { setKatEklemeAcik(false); setYeniKatIsim(""); setYeniKatEmoji("🍽️"); }}
                    className="flex-1 rounded-lg py-1.5 text-xs"
                    style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text2)" }}>İptal</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setKatEklemeAcik(true)}
                className="w-full rounded-lg py-2 text-xs font-medium"
                style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
                + Kategori Ekle
              </button>
            )}
          </div>
        </div>

        {/* Sağ — Ürün Listesi */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="hidden md:flex px-4 py-3 items-center justify-between"
            style={{ background: "var(--ast-sidebar-bg)", borderBottom: "1px solid var(--ast-divider)" }}>
            <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--ast-text1)" }}>
              {kategoriler.find((k) => k.id === aktifKat)?.emoji && (
                <span>{kategoriler.find((k) => k.id === aktifKat)?.emoji}</span>
              )}
              {kategoriler.find((k) => k.id === aktifKat)?.isim ?? "Kategori seç"}
              <span className="font-normal" style={{ color: "var(--ast-text3)" }}>({aktifUrunler.length} ürün)</span>
            </p>
            {kategoriler.length > 0 && (
              <button onClick={urunEkleAc} className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
                + Ürün Ekle
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4" style={{ paddingBottom: 80 }}>
            {kategoriler.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48" style={{ color: "var(--ast-text2)" }}>
                <p className="text-4xl mb-3">📂</p>
                <p className="text-sm">Önce sol taraftan bir kategori ekle</p>
              </div>
            ) : aktifUrunler.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48" style={{ color: "var(--ast-text2)" }}>
                <p className="text-4xl mb-3">🍽️</p>
                <p className="text-sm">Bu kategoride ürün yok</p>
                <button onClick={urunEkleAc} className="mt-3 text-sm font-medium" style={{ color: "var(--ast-gold)" }}>+ Ürün Ekle</button>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
                {aktifUrunler.map((urun) => (
                  <div key={urun.id} className="rounded-xl overflow-hidden"
                    style={{ background: "var(--ast-card-bg)", border: "1px solid var(--ast-card-border)", boxShadow: "var(--ast-card-shadow)" }}>
                    {/* Mobil */}
                    <div className="flex md:hidden items-center gap-3 p-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-2xl"
                        style={{ background: "var(--ast-icon-bg)" }}>
                        {urun.gorsel ? <img src={urun.gorsel} alt={urun.isim} className="w-full h-full object-cover" /> : "🍽️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate" style={{ color: "var(--ast-text1)" }}>{urun.isim}</h3>
                        <span className="font-bold text-sm" style={{ color: "var(--ast-gold)" }}>{urun.fiyat} ₺</span>
                        {urun.kalori && <span className="text-xs ml-2" style={{ color: "var(--ast-text3)" }}>🔥{urun.kalori}</span>}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => urunDuzenleAc(urun, aktifKat!)}
                          className="px-3 py-1 rounded-lg text-xs font-medium"
                          style={{ border: "1px solid var(--ast-divider)", color: "var(--ast-text1)", background: "var(--ast-badge-bg)" }}>
                          Düzenle
                        </button>
                        <button onClick={() => urunSil(urun.id)}
                          className="px-3 py-1 rounded-lg text-xs font-medium"
                          style={{ border: "1px solid var(--ast-error-border)", color: "var(--ast-error-text)", background: "var(--ast-error-bg)" }}>
                          Sil
                        </button>
                      </div>
                    </div>
                    {/* Masaüstü */}
                    <div className="hidden md:block">
                      {urun.gorsel ? (
                        <img src={urun.gorsel} alt={urun.isim} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center text-4xl" style={{ background: "var(--ast-icon-bg)" }}>🍽️</div>
                      )}
                      <div className="p-3">
                        <h3 className="font-semibold text-sm truncate" style={{ color: "var(--ast-text1)" }}>{urun.isim}</h3>
                        {urun.aciklama && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--ast-text2)" }}>{urun.aciklama}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-bold" style={{ color: "var(--ast-gold)" }}>{urun.fiyat} ₺</span>
                          {urun.kalori && <span className="text-xs" style={{ color: "var(--ast-text3)" }}>🔥 {urun.kalori} kal</span>}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => urunDuzenleAc(urun, aktifKat!)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                            style={{ border: "1px solid var(--ast-divider)", color: "var(--ast-text1)", background: "var(--ast-badge-bg)" }}>
                            Düzenle
                          </button>
                          <button onClick={() => urunSil(urun.id)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                            style={{ border: "1px solid var(--ast-error-border)", color: "var(--ast-error-text)" }}>
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ürün Modal */}
      {urunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--ast-modal-overlay)" }}>
          <div className="w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ background: "var(--ast-modal-bg)", border: "1px solid var(--ast-card-border)" }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--ast-divider)" }}>
              <h2 className="font-bold" style={{ color: "var(--ast-text1)" }}>
                {urunModal.mod === "ekle" ? "Yeni Ürün Ekle" : "Ürünü Düzenle"}
              </h2>
              <button onClick={() => setUrunModal(null)} className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: "var(--ast-text2)", background: "var(--ast-badge-bg)" }}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--ast-text2)" }}>Kategori *</label>
                <select value={urunForm.kategoriId} onChange={(e) => setUrunForm({ ...urunForm, kategoriId: e.target.value })}
                  style={{ ...inputStyle, appearance: "none" }}>
                  <option value="">— Kategori seç —</option>
                  {kategoriler.map((k) => <option key={k.id} value={k.id}>{k.emoji ?? "🍽️"} {k.isim}</option>)}
                </select>
              </div>
              {[
                { key: "isim" as const, label: "Ürün Adı *", placeholder: "Örn: Margherita Pizza" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ast-text2)" }}>{label}</label>
                  <input value={urunForm[key]} onChange={(e) => setUrunForm({ ...urunForm, [key]: e.target.value })}
                    style={inputStyle} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--ast-text2)" }}>Açıklama</label>
                <textarea value={urunForm.aciklama} onChange={(e) => setUrunForm({ ...urunForm, aciklama: e.target.value })}
                  className="resize-none h-20" style={{ ...inputStyle }} placeholder="Ürün hakkında kısa açıklama" />
              </div>
              <div className="flex gap-3">
                {[
                  { key: "fiyat" as const, label: "Fiyat (₺) *", placeholder: "0", type: "number" },
                  { key: "kalori" as const, label: "Kalori (opsiyonel)", placeholder: "kcal", type: "number" },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key} className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: "var(--ast-text2)" }}>{label}</label>
                    <input type={type} value={urunForm[key]} onChange={(e) => setUrunForm({ ...urunForm, [key]: e.target.value })}
                      style={inputStyle} placeholder={placeholder} />
                  </div>
                ))}
              </div>
              {[
                { key: "icerik" as const, label: "İçerik / Malzemeler", placeholder: "Örn: Un, domates, peynir" },
                { key: "alerjenler" as const, label: "Alerjenler", placeholder: "Örn: Gluten, süt ürünleri" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ast-text2)" }}>{label}</label>
                  <input value={urunForm[key]} onChange={(e) => setUrunForm({ ...urunForm, [key]: e.target.value })}
                    style={inputStyle} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--ast-text2)" }}>Görsel</label>
                <input ref={dosyaInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={gorselSec} className="hidden" />
                <div className="flex items-center gap-3">
                  {urunForm.gorsel && (
                    <img src={urunForm.gorsel} alt="önizleme" className="w-14 h-14 rounded-lg object-cover shrink-0"
                      style={{ border: "1px solid var(--ast-divider)" }} />
                  )}
                  <button type="button" onClick={() => dosyaInputRef.current?.click()} disabled={gorselYukleniyor}
                    className="flex-1 py-2.5 text-sm disabled:opacity-50"
                    style={{ border: "1px dashed var(--ast-divider)", borderRadius: 12, color: "var(--ast-text2)", background: "transparent" }}>
                    {gorselYukleniyor ? "Yükleniyor..." : urunForm.gorsel ? "Görseli Değiştir" : "📷 Görsel Seç (PNG/JPG)"}
                  </button>
                  {urunForm.gorsel && (
                    <button type="button" onClick={() => setUrunForm((f) => ({ ...f, gorsel: "" }))}
                      className="text-xs px-2" style={{ color: "var(--ast-error-text)" }}>✕</button>
                  )}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 flex gap-3" style={{ borderTop: "1px solid var(--ast-divider)" }}>
              <button onClick={() => setUrunModal(null)}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ border: "1px solid var(--ast-divider)", color: "var(--ast-text2)", background: "var(--ast-badge-bg)" }}>
                İptal
              </button>
              <button onClick={urunKaydet}
                disabled={yukleniyor || gorselYukleniyor || !urunForm.isim.trim() || !urunForm.fiyat || !urunForm.kategoriId}
                className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
                {yukleniyor ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kırpma Modalı */}
      {kirpModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="rounded-2xl w-full overflow-hidden" style={{ maxWidth: KIRP_BOYUT + 40, background: "var(--ast-modal-bg)", border: "1px solid var(--ast-card-border)" }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--ast-divider)" }}>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--ast-text1)" }}>Fotoğrafı Konumlandır</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--ast-text3)" }}>
                  {kirpModal.displayW > KIRP_BOYUT ? "Sola/sağa sürükle" : "Yukarı/aşağı sürükle"}
                </p>
              </div>
              <button
                onClick={() => { URL.revokeObjectURL(kirpModal.imgUrl); setKirpModal(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background: "var(--ast-badge-bg)", color: "var(--ast-text2)" }}>✕
              </button>
            </div>

            <div className="p-5 flex justify-center">
              {/* Kırpma çerçevesi */}
              <div
                style={{
                  width: KIRP_BOYUT, height: KIRP_BOYUT,
                  overflow: "hidden", borderRadius: 12,
                  position: "relative",
                  border: "2px solid var(--ast-gold)",
                  cursor: "grab",
                  touchAction: "none",
                  userSelect: "none",
                }}
                onMouseDown={(e) => { e.preventDefault(); kirpDragBasla(e.clientX, e.clientY); }}
                onMouseMove={(e) => kirpDragHareket(e.clientX, e.clientY)}
                onMouseUp={kirpDragBitir}
                onMouseLeave={kirpDragBitir}
                onTouchStart={(e) => { e.preventDefault(); kirpDragBasla(e.touches[0].clientX, e.touches[0].clientY); }}
                onTouchMove={(e) => { e.preventDefault(); kirpDragHareket(e.touches[0].clientX, e.touches[0].clientY); }}
                onTouchEnd={kirpDragBitir}
              >
                <div
                  ref={kirpImgRef}
                  style={{
                    position: "absolute",
                    width: kirpModal.displayW,
                    height: kirpModal.displayH,
                    transform: "translate(0px, 0px)",
                    pointerEvents: "none",
                  }}
                >
                  <img
                    src={kirpModal.imgUrl}
                    alt=""
                    draggable={false}
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => { URL.revokeObjectURL(kirpModal.imgUrl); setKirpModal(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ border: "1px solid var(--ast-divider)", color: "var(--ast-text2)", background: "var(--ast-badge-bg)" }}>
                İptal
              </button>
              <button
                onClick={kirpVeYukle}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #C89434, #E8B84B)", color: "#0A0705" }}>
                Kırp ve Yükle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
