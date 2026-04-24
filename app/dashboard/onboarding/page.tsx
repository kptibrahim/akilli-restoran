import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import OnboardingClient from "@/components/dashboard/OnboardingClient";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase
    .from("Restoran")
    .select("id, isim, aciklama, renk, logo")
    .eq("userId", user.id)
    .single();

  if (!restoran) redirect("/auth/giris");

  return <OnboardingClient restoran={{ id: restoran.id, isim: restoran.isim ?? "", aciklama: restoran.aciklama ?? "" }} />;
}
