import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AnalitikClient from "@/components/dashboard/AnalitikClient";

export default async function AnalitikPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase.from("Restoran").select("id, timezone").eq("userId", user.id).single();
  const restoranId = restoran?.id ?? "";
  const timezone = (restoran?.timezone as string | null) ?? "Europe/Istanbul";

  return <AnalitikClient restoranId={restoranId} timezone={timezone} />;
}
