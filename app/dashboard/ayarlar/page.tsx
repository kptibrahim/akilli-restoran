import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AyarlarClient from "@/components/dashboard/AyarlarClient";

export default async function AyarlarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase
    .from("Restoran")
    .select("id, isim, slug, renk, logo, aciklama, sosyalMedya, selectedLanguages, wifiAdi, wifiSifre, pin_kasiyer, pin_mutfak")
    .eq("userId", user.id)
    .single();

  if (!restoran) redirect("/dashboard");

  return <AyarlarClient restoran={restoran} />;
}
