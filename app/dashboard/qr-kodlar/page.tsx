import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import QrKodlarClient from "./QrKodlarClient";

export default async function QrKodlarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase
    .from("Restoran")
    .select("slug, logo")
    .eq("userId", user.id)
    .single();

  if (!restoran?.slug) redirect("/dashboard");

  return <QrKodlarClient slug={restoran.slug} logo={restoran.logo ?? null} />;
}
