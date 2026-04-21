"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function KayitForm() {
  const [restoranIsim, setRestoranIsim] = useState("");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  function slugOlustur(isim: string) {
    return isim
      .toLowerCase()
      .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Math.random().toString(36).slice(2, 6);
  }

  async function kayitOl() {
    if (!restoranIsim || !email || !sifre) {
      setHata("Tüm alanları doldurun.");
      return;
    }
    if (sifre.length < 6) {
      setHata("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setHata("");
    setYukleniyor(true);

    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: sifre });

      if (authError || !authData.user) {
        setHata(authError?.message ?? "Kayıt başarısız.");
        setYukleniyor(false);
        return;
      }

      const res = await fetch("/api/restoran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isim: restoranIsim,
          slug: slugOlustur(restoranIsim),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setHata(data.error ?? "Restoran kaydı oluşturulamadı.");
        setYukleniyor(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setHata("Bağlantı hatası. Lütfen tekrar deneyin.");
      setYukleniyor(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Restoran / İşletme Adı</label>
        <input
          type="text"
          value={restoranIsim}
          onChange={(e) => setRestoranIsim(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400"
          placeholder="Lezzet Durağı"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">E-posta</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400"
          placeholder="isletme@mail.com"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Şifre</label>
        <input
          type="password"
          autoComplete="new-password"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400"
          placeholder="En az 6 karakter"
        />
      </div>
      {hata && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{hata}</p>}
      <button
        type="button"
        onClick={kayitOl}
        disabled={yukleniyor}
        className="w-full bg-orange-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50 active:opacity-70"
      >
        {yukleniyor ? "Oluşturuluyor..." : "Hesap Oluştur"}
      </button>
    </div>
  );
}
