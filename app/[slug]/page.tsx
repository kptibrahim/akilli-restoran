import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import HosGeldinClient from "@/components/HosGeldinClient";

export default async function HosGeldinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ masa?: string }>;
}) {
  const { slug } = await params;
  const { masa } = await searchParams;

  const { data: restoran } = await db
    .from("Restoran")
    .select("id, slug, isim, renk, logo, aciklama, wifiAdi, wifiSifre, sosyalMedya, selectedLanguages, translations")
    .eq("slug", slug)
    .eq("aktif", true)
    .single();

  if (!restoran) notFound();

  return (
    <HosGeldinClient
      restoran={restoran}
      masa={masa}
    />
  );
}
