import { createClient } from "@supabase/supabase-js";

const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
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

  const { data: restoran } = await adminDb
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
