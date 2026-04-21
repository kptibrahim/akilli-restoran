"use client";

import { useState, useRef, useEffect } from "react";

export type OnerilenUrun = {
  id: string;
  isim: string;
  fiyat: number;
  gorsel: string | null;
  kategoriId: string;
};

type Mesaj = {
  rol: "user" | "assistant";
  icerik: string;
  onerilen?: OnerilenUrun[];
};

const HIZLI_SORULAR: Record<string, string[]> = {
  tr: ["En popüler?", "Vejetaryen?", "Glutensiz?", "500 kal altı?"],
  en: ["Most popular?", "Vegetarian?", "Gluten-free?", "Under 500 cal?"],
  ru: ["Популярные?", "Вегетарианское?", "Без глютена?", "До 500 кал?"],
};

const KARSILAMA: Record<string, (isim: string) => string> = {
  tr: (isim) => `Merhaba! ${isim} menüsünde size nasıl yardımcı olabilirim?`,
  en: (isim) => `Hi! How can I help you with ${isim}'s menu?`,
  ru: (isim) => `Привет! Чем могу помочь с меню ${isim}?`,
};

export default function Chatbot({
  restoranId,
  restoranIsim,
  renk,
  dil = "tr",
  dilIsim = "",
  onUrunGoster,
}: {
  restoranId: string;
  restoranIsim: string;
  renk: string;
  dil?: string;
  dilIsim?: string;
  onUrunGoster: (urunId: string, kategoriId: string) => void;
}) {
  const karsilama = (KARSILAMA[dil] ?? KARSILAMA.tr)(restoranIsim);
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([
    { rol: "assistant", icerik: karsilama },
  ]);
  const [input, setInput] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const altRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mesajlar]);

  async function gonder(soru?: string) {
    const metin = (soru ?? input).trim();
    if (!metin || yukleniyor) return;
    setInput("");
    const yeniMesajlar: Mesaj[] = [...mesajlar, { rol: "user", icerik: metin }];
    setMesajlar(yeniMesajlar);
    setYukleniyor(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restoranId,
          mesajlar: yeniMesajlar.map((m) => ({ rol: m.rol, icerik: m.icerik })),
          dil,
          dilIsim,
        }),
      });
      const data = (await res.json()) as { cevap?: string; onerilen?: OnerilenUrun[] };
      setMesajlar((prev) => [
        ...prev,
        { rol: "assistant", icerik: data.cevap ?? "...", onerilen: data.onerilen ?? [] },
      ]);
    } catch {
      setMesajlar((prev) => [
        ...prev,
        {
          rol: "assistant",
          icerik:
            dil === "en"
              ? "Sorry, try again."
              : dil === "ru"
              ? "Извините, попробуйте снова."
              : "Bir hata oluştu.",
        },
      ]);
    } finally {
      setYukleniyor(false);
    }
  }

  const [acik, setAcik] = useState(false);
  const hizliSorular = HIZLI_SORULAR[dil] ?? HIZLI_SORULAR.tr;
  const sonAssistantMesaj = [...mesajlar].reverse().find((m) => m.rol === "assistant");

  const placeholder =
    dil === "en" ? "Ask Gastronom AI..." : dil === "ru" ? "Спросить Gastronom AI..." : "Gastronom AI'e sor...";

  return (
    <div className="w-full bg-white border-t border-gray-100 rounded-t-3xl shadow-2xl overflow-hidden">

      {/* Genişletilmiş panel — sadece açıkken */}
      {acik && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: renk }}
              >
                🤖
              </div>
              <span className="text-sm font-bold text-gray-800 tracking-wide">GASTRONOM AI</span>
              <span className="w-2 h-2 rounded-full bg-green-400" />
            </div>
            <button
              onClick={() => setAcik(false)}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* Mesaj alanı */}
          <div
            className="px-4 overflow-y-auto flex flex-col gap-2 pb-2"
            style={{ maxHeight: "calc(100vh / 6)" }}
          >
            {mesajlar.slice(-6).map((m, i) => (
              <div key={i} className={`flex ${m.rol === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.rol === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                  style={m.rol === "user" ? { backgroundColor: renk } : {}}
                >
                  {m.icerik}
                </div>
              </div>
            ))}
            {yukleniyor && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={altRef} />
          </div>

          {/* Önerilen ürün chip'leri */}
          {sonAssistantMesaj?.onerilen && sonAssistantMesaj.onerilen.length > 0 && (
            <div
              className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-gray-50"
              style={{ scrollbarWidth: "none" }}
            >
              {sonAssistantMesaj.onerilen.map((urun) => (
                <button
                  key={urun.id}
                  onClick={() => onUrunGoster(urun.id, urun.kategoriId)}
                  className="flex-shrink-0 flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border-2 bg-white text-xs font-semibold active:scale-95 transition-transform"
                  style={{ borderColor: renk, color: renk }}
                >
                  {urun.gorsel ? (
                    <img src={urun.gorsel} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">🍽️</span>
                  )}
                  <span className="text-gray-800">{urun.isim}</span>
                  <span className="text-gray-400 font-normal">₺{urun.fiyat.toFixed(0)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Hızlı sorular — sadece başlangıçta */}
          {mesajlar.length <= 1 && (
            <div
              className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-gray-50"
              style={{ scrollbarWidth: "none" }}
            >
              {hizliSorular.map((s) => (
                <button
                  key={s}
                  onClick={() => gonder(s)}
                  className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50 flex-shrink-0"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Input — her zaman görünür */}
      <div
        className="px-4 py-3 flex gap-2"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setAcik(true)}
          onKeyDown={(e) => e.key === "Enter" && gonder()}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-gray-400"
        />
        <button
          onClick={() => { setAcik(true); gonder(); }}
          disabled={yukleniyor}
          className="text-white w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 flex-shrink-0"
          style={{ backgroundColor: renk }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
