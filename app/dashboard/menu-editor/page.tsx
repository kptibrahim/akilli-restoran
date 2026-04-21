import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import MenuEditor from "@/components/dashboard/MenuEditor";

export default async function MenuEditorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/giris");

  const { data: restoran } = await supabase
    .from("Restoran")
    .select("id, isim, slug, renk")
    .eq("userId", user.id)
    .single();

  if (!restoran) redirect("/dashboard");

  const { data: kategoriler } = await supabase
    .from("Kategori")
    .select("*, urunler:Urun(*)")
    .eq("restoranId", restoran.id)
    .order("sira");

  const liste = (kategoriler ?? []).map((k) => ({
    ...k,
    urunler: ((k.urunler ?? []) as Array<{ id: string; isim: string; aciklama: string | null; fiyat: number; kalori: number | null; icerik: string | null; alerjenler: string | null; gorsel: string | null; aktif: boolean; sira: number }>)
      .sort((a, b) => a.sira - b.sira),
  }));

  return <MenuEditor restoranId={restoran.id} kategoriler={liste} />;
}
