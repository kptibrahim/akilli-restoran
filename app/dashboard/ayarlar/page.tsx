import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AyarlarClient from "@/components/dashboard/AyarlarClient";
import RestoranKurClient from "@/components/dashboard/RestoranKurClient";

export default async function AyarlarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase
    .from("Restoran")
    .select("id, isim, slug, renk, logo, aciklama, sosyalMedya, selectedLanguages, wifiAdi, wifiSifre, pin_yonetici, pin_kasiyer, pin_mutfak")
    .eq("userId", user.id)
    .single();

  if (!restoran) return <RestoranKurClient />;

  return <AyarlarClient restoran={restoran as typeof restoran & { pin_yonetici: string | null; pin_kasiyer: string | null; pin_mutfak: string | null }} />;
}
