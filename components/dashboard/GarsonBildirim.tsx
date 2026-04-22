"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

type GarsonCagri = {
  id: string;
  masaNo: string;
  durum: "bekliyor" | "geliyor";
  tip: "garson" | "hesap";
  olusturuldu: string;
};

export default function GarsonBildirim({ restoranId }: { restoranId: string }) {
  const [cagrilar, setCagrilar] = useState<GarsonCagri[]>([]);
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function yukle() {
      const { data } = await supabase
        .from("GarsonCagri")
        .select("id, masaNo, durum, tip, olusturuldu")
        .eq("restoranId", restoranId)
        .eq("durum", "bekliyor")
        .order("olusturuldu", { ascending: true });
      setCagrilar((data as GarsonCagri[]) ?? []);
    }

    yukle();

    const kanal = supabase
      .channel(`garson-bildirim-${restoranId}`)
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
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" style={{ maxWidth: "320px" }}>
      {cagrilar.map((c) => {
        const hesap = c.tip === "hesap";
        return (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 bg-white rounded-2xl shadow-xl px-4 border-2"
            style={{
              height: "10vh",
              minHeight: "64px",
              maxHeight: "80px",
              borderColor: hesap ? "#f59e0b" : "#f87171",
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0"
              style={{ backgroundColor: hesap ? "#f59e0b" : "#ef4444" }}
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-800 leading-tight truncate">
                📍 Masa {c.masaNo}
              </p>
              <p
                className="text-xs font-semibold leading-tight truncate"
                style={{ color: hesap ? "#d97706" : "#dc2626" }}
              >
                {hesap ? "hesap istiyor" : "garson talep ediyor"}
              </p>
            </div>

            <button
              onClick={() => onayla(c.id)}
              disabled={yukleniyor === c.id}
              className="flex-shrink-0 h-8 px-4 rounded-full text-white text-xs font-bold bg-green-500 active:scale-95 transition-transform disabled:opacity-60 whitespace-nowrap"
            >
              {yukleniyor === c.id ? "..." : "Tamam"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
