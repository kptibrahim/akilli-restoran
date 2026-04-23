import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AyarlarClient from "@/components/dashboard/AyarlarClient";

export default async function AyarlarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase
    .from("Restoran")
    .select("id, isim, slug, renk, logo, aciklama, sosyalMedya, selectedLanguages, wifiAdi, wifiSifre")
    .eq("userId", user.id)
    .single();

  if (!restoran) redirect("/dashboard");

  const restoranVeri = restoran
    ? { ...restoran, pin_kasiyer: null as string | null, pin_mutfak: null as string | null }
    : null;

  return <AyarlarClient restoran={restoranVeri} />;
}
