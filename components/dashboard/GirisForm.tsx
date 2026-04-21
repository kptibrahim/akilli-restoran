"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function GirisForm() {
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function girisYap() {
    if (!email || !sifre) {
      setHata("E-posta ve şifre zorunludur.");
      return;
    }
    setHata("");
    setYukleniyor(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: sifre });
      if (error) {
        setHata("E-posta veya şifre hatalı.");
        setYukleniyor(false);
        return;
      }
      window.location.replace("/dashboard");
    } catch {
      setHata("Bağlantı hatası. Tekrar deneyin.");
      setYukleniyor(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
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
          autoComplete="current-password"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400"
          placeholder="••••••••"
        />
      </div>
      {hata && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{hata}</p>}
      <div
        onClick={girisYap}
        style={{
          background: yukleniyor ? "#ccc" : "#f97316",
          color: "white",
          borderRadius: "12px",
          padding: "14px",
          textAlign: "center",
          fontWeight: "600",
          fontSize: "14px",
          cursor: yukleniyor ? "default" : "pointer",
          userSelect: "none",
        }}
      >
        {yukleniyor ? "Giriş yapılıyor..." : "Giriş Yap"}
      </div>
    </div>
  );
}
