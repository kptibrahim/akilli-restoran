import { adminDb } from "@/lib/supabase-admin";

export const PAKET_OZELLIKLERI = {
  ucretsiz: {
    isim: "Ücretsiz",
    aiChatbot: false,
    aiCeviri: false,
    aiMenuImport: false,
    cokluDil: 1,
    masaLimiti: 5,
    urunLimiti: 30,
    chatbotMesajAylik: 0,
    customBranding: false,
    oncelikliDestek: false,
    cokluSube: 1,
  },
  baslangic: {
    isim: "Başlangıç",
    aiChatbot: false,
    aiCeviri: false,
    aiMenuImport: false,
    cokluDil: 5,
    masaLimiti: 10,
    urunLimiti: -1,
    chatbotMesajAylik: 0,
    customBranding: true,
    oncelikliDestek: false,
    cokluSube: 1,
  },
  profesyonel: {
    isim: "Profesyonel AI",
    aiChatbot: true,
    aiCeviri: true,
    aiMenuImport: true,
    cokluDil: 15,
    masaLimiti: 25,
    urunLimiti: -1,
    chatbotMesajAylik: 5000,
    customBranding: true,
    oncelikliDestek: true,
    cokluSube: 1,
  },
  premium: {
    isim: "Premium AI",
    aiChatbot: true,
    aiCeviri: true,
    aiMenuImport: true,
    cokluDil: 15,
    masaLimiti: -1,
    urunLimiti: -1,
    chatbotMesajAylik: -1,
    customBranding: true,
    oncelikliDestek: true,
    cokluSube: 2,
  },
} as const;

export type PaketTipi = keyof typeof PAKET_OZELLIKLERI;

export async function getRestoranPaketi(restoranId: string): Promise<PaketTipi> {
  const { data } = await adminDb
    .from("Abonelik")
    .select("paket, durum")
    .eq("restoranId", restoranId)
    .eq("durum", "aktif")
    .single();

  const paket = (data?.paket as string | null) ?? "ucretsiz";
  if (paket in PAKET_OZELLIKLERI) return paket as PaketTipi;
  return "ucretsiz";
}

export async function ozellikErisimVarMi(
  restoranId: string,
  ozellik: keyof typeof PAKET_OZELLIKLERI.profesyonel
): Promise<boolean> {
  const paket = await getRestoranPaketi(restoranId);
  return PAKET_OZELLIKLERI[paket][ozellik] === true;
}

export async function limitKontrol(
  restoranId: string,
  limit: "masaLimiti" | "urunLimiti" | "chatbotMesajAylik",
  mevcutSayi: number
): Promise<{ izinVar: boolean; limit: number; kullanilan: number }> {
  const paket = await getRestoranPaketi(restoranId);
  const limitDeger = PAKET_OZELLIKLERI[paket][limit] as number;

  if (limitDeger === -1) return { izinVar: true, limit: -1, kullanilan: mevcutSayi };
  return { izinVar: mevcutSayi < limitDeger, limit: limitDeger, kullanilan: mevcutSayi };
}
