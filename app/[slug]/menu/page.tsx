import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import MenuClient from "@/components/MenuClient";
import type { Kategori } from "@/lib/types";

type KategoriRow = Kategori & { sira: number };

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ masa?: string; dil?: string }>;
}) {
  const { slug } = await params;
  const { masa, dil = "tr" } = await searchParams;

  const { data: restoran } = await db
    .from("Restoran")
    .select("id, slug, isim, renk, logo, selectedLanguages")
    .eq("slug", slug)
    .eq("aktif", true)
    .single();

  if (!restoran) notFound();

  const { data: kategoriler } = await db
    .from("Kategori")
    .select("*, urunler:Urun(*)")
    .eq("restoranId", restoran.id)
    .order("sira");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kategoriListesi: KategoriRow[] = (kategoriler ?? []).map((k: any) => ({
    id: k.id as string,
    isim: k.isim as string,
    sira: k.sira as number,
    emoji: k.emoji ?? null,
    translations: (k.translations ?? {}) as Record<string, Record<string, string>>,
    urunler: ((k.urunler ?? []) as any[])
      .filter((u) => u.aktif)
      .sort((a, b) => a.sira - b.sira)
      .map((u) => ({
        id: u.id,
        isim: u.isim,
        aciklama: u.aciklama ?? null,
        fiyat: u.fiyat,
        kalori: u.kalori ?? null,
        icerik: u.icerik ?? null,
        alerjenler: u.alerjenler ?? null,
        gorsel: u.gorsel ?? null,
        translations: (u.translations ?? {}) as Record<string, Record<string, string>>,
      })),
  }));

  const selectedLanguages = (restoran.selectedLanguages as string[] | null) ?? ["tr"];

  return (
    <MenuClient
      restoran={restoran}
      kategoriler={kategoriListesi}
      masaNo={masa ?? null}
      dil={dil}
      selectedLanguages={selectedLanguages}
    />
  );
}
