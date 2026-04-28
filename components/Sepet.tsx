"use client";

import { useState } from "react";
import type { SepetItem } from "@/lib/types";

const SEPET_UI = {
  tr: {
    baslik: "Sepetim",
    bos: "Sepetiniz boş",
    masaYok: "Masa bilgisi yok — QR kodu okutun",
    not: "Özel not (isteğe bağlı)",
    toplam: "Toplam",
    gonderiyor: "Gönderiliyor...",
    siparisVer: "Sipariş Ver",
    siparisAlindi: "Sipariş Alındı!",
    siparisIletildi: "Siparişiniz mutfağa iletildi. Kısa sürede hazırlanacak.",
    tamam: "Tamam",
  },
  en: {
    baslik: "My Cart",
    bos: "Your cart is empty",
    masaYok: "No table info — please scan QR code",
    not: "Special note (optional)",
    toplam: "Total",
    gonderiyor: "Sending...",
    siparisVer: "Place Order",
    siparisAlindi: "Order Received!",
    siparisIletildi: "Your order has been sent to the kitchen.",
    tamam: "OK",
  },
  ru: {
    baslik: "Корзина",
    bos: "Корзина пуста",
    masaYok: "Нет данных о столе — отсканируйте QR",
    not: "Особые пожелания (необязательно)",
    toplam: "Итого",
    gonderiyor: "Отправка...",
    siparisVer: "Заказать",
    siparisAlindi: "Заказ принят!",
    siparisIletildi: "Ваш заказ передан на кухню.",
    tamam: "ОК",
  },
};

function getSepetUI(dil: string) {
  return SEPET_UI[dil as keyof typeof SEPET_UI] ?? SEPET_UI.en;
}

export default function Sepet({
  sepet,
  setSepet,
  toplam,
  renk,
  restoranId,
  masaNo: masaNoProps,
  dil = "tr",
  onKapat,
}: {
  sepet: SepetItem[];
  setSepet: React.Dispatch<React.SetStateAction<SepetItem[]>>;
  toplam: number;
  renk: string;
  restoranId: string;
  masaNo?: string;
  dil?: string;
  onKapat: () => void;
}) {
  const masaNo = masaNoProps ?? "";
  const ui = getSepetUI(dil);
  const [not, setNot] = useState("");
  const [gonderiyor, setGonderiyor] = useState(false);
  const [basarili, setBasarili] = useState(false);

  function adetDegistir(urunId: string, delta: number) {
    setSepet((prev) =>
      prev
        .map((i) =>
          i.urun.id === urunId ? { ...i, adet: i.adet + delta } : i
        )
        .filter((i) => i.adet > 0)
    );
  }

  async function siparisVer() {
    if (sepet.length === 0) return;
    setGonderiyor(true);

    try {
      const res = await fetch("/api/siparis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restoranId,
          masaNo: masaNo.trim() || "Bilinmiyor",
          notlar: not,
          urunler: sepet.map((i) => ({
            urunId: i.urun.id,
            isim: i.urun.isim,
            adet: i.adet,
            fiyat: i.urun.fiyat,
          })),
          toplam,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setBasarili(true);
        setSepet([]);
      } else if (res.status === 429) {
        const resetAt = data.resetAt ? new Date(data.resetAt) : null;
        const kalan = resetAt ? Math.ceil((resetAt.getTime() - Date.now()) / 60000) : 15;
        alert(
          dil === "en"
            ? `Too many orders. Please wait ${kalan} minute(s) and try again.`
            : dil === "ru"
            ? `Слишком много заказов. Подождите ${kalan} мин. и попробуйте снова.`
            : `Çok fazla sipariş gönderildi. Lütfen ${kalan} dakika bekleyip tekrar deneyin.`
        );
      } else {
        const msg = data.error ?? "";
        alert(
          dil === "en"
            ? `Order could not be sent. ${msg}`
            : dil === "ru"
            ? `Не удалось отправить заказ. ${msg}`
            : `Sipariş gönderilemedi. ${msg}`
        );
      }
    } catch {
      alert(
        dil === "en"
          ? "Order could not be sent. Check your connection."
          : dil === "ru"
          ? "Не удалось отправить заказ. Проверьте соединение."
          : "Sipariş gönderilemedi. Bağlantını kontrol et."
      );
    } finally {
      setGonderiyor(false);
    }
  }

  if (basarili) {
    return (
      <div className="fixed inset-0 z-30 bg-white flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-800">{ui.siparisAlindi}</h2>
        <p className="text-gray-500 text-center">{ui.siparisIletildi}</p>
        <button
          onClick={onKapat}
          className="text-white py-3 px-8 rounded-2xl font-semibold"
          style={{ backgroundColor: renk }}
        >
          {ui.tamam}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-white">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: renk }}
      >
        <h2 className="font-bold text-lg">{ui.baslik}</h2>
        <button onClick={onKapat} className="text-xl font-bold">✕</button>
      </div>

      {/* Ürünler */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {sepet.length === 0 ? (
          <p className="text-center text-gray-400 mt-20">{ui.bos}</p>
        ) : (
          sepet.map((item) => (
            <div
              key={item.urun.id}
              className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-800">{item.urun.isim}</p>
                <p className="text-sm text-gray-500">
                  ₺{(item.urun.fiyat * item.adet).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adetDegistir(item.urun.id, -1)}
                  className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-bold"
                >
                  −
                </button>
                <span className="font-semibold w-4 text-center">{item.adet}</span>
                <button
                  onClick={() => adetDegistir(item.urun.id, 1)}
                  className="w-7 h-7 rounded-full text-white font-bold"
                  style={{ backgroundColor: renk }}
                >
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Masa No + Not + Sipariş */}
      {sepet.length > 0 && (
        <div className="px-4 py-4 border-t space-y-3 bg-white">
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
            <span className="text-sm">📍</span>
            {masaNoProps ? (
              <span className="text-sm font-semibold text-orange-700">{masaNoProps}</span>
            ) : (
              <span className="text-sm text-orange-400 italic">{ui.masaYok}</span>
            )}
          </div>
          <textarea
            placeholder={ui.not}
            value={not}
            onChange={(e) => setNot(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none resize-none h-16"
          />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{ui.toplam}</p>
              <p className="text-xl font-bold" style={{ color: renk }}>
                ₺{toplam.toFixed(2)}
              </p>
            </div>
            <button
              onClick={siparisVer}
              disabled={gonderiyor}
              className="text-white py-3 px-6 rounded-2xl font-semibold disabled:opacity-50"
              style={{ backgroundColor: renk }}
            >
              {gonderiyor ? ui.gonderiyor : ui.siparisVer}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
