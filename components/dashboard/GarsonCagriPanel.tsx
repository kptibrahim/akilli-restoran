"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

type GarsonCagri = {
  id: string;
  masaNo: string;
  durum: "bekliyor" | "geliyor";
  olusturuldu: string;
};

export default function GarsonCagriPanel({ restoranId }: { restoranId: string }) {
  const [cagrilar, setCagrilar] = useState<GarsonCagri[]>([]);
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function yukle() {
      const { data } = await supabase
        .from("GarsonCagri")
        .select("id, masaNo, durum, olusturuldu")
        .eq("restoranId", restoranId)
        .in("durum", ["bekliyor", "geliyor"])
        .order("olusturuldu", { ascending: true });
      setCagrilar((data as GarsonCagri[]) ?? []);
    }

    yukle();

    const kanal = supabase
      .channel(`garson-panel-${restoranId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "GarsonCagri" },
        () => yukle()
      )
      .subscribe();

    const poller = setInterval(yukle, 4000);

    return () => {
      supabase.removeChannel(kanal);
      clearInterval(poller);
    };
  }, [restoranId]);

  async function onayla(id: string) {
    setYukleniyor(id);
    await fetch("/api/garson-onayla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setYukleniyor(null);
  }

  if (cagrilar.length === 0) return null;

  return (
    <div className="mb-5 p-4 rounded-2xl border border-red-200 bg-red-50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔔</span>
        <p className="font-bold text-red-700 text-sm">
          {cagrilar.length} masadan garson talebi
        </p>
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        {cagrilar.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border"
            style={{ borderColor: c.durum === "geliyor" ? "#86efac" : "#fca5a5" }}
          >
            <div>
              <p className="font-bold text-gray-800 text-sm">📍 Masa {c.masaNo}</p>
              <p
                className="text-xs font-semibold mt-0.5"
                style={{ color: c.durum === "geliyor" ? "#16a34a" : "#ef4444" }}
              >
                {c.durum === "geliyor" ? "✓ Garson gidiyor" : "Bekleniyor..."}
              </p>
            </div>
            {c.durum === "bekliyor" && (
              <button
                onClick={() => onayla(c.id)}
                disabled={yukleniyor === c.id}
                className="h-8 px-4 rounded-full text-white text-xs font-bold bg-green-500 active:scale-95 transition-transform disabled:opacity-60"
              >
                {yukleniyor === c.id ? "..." : "Gidiyorum"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
