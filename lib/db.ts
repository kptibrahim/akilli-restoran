import { createClient } from "@supabase/supabase-js";

// Sunucu tarafı için service role key ile tam yetkili client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const db = createClient(supabaseUrl, supabaseKey);

// Tip tanımları
export type Restoran = {
  id: string;
  slug: string;
  isim: string;
  logo: string | null;
  aciklama: string | null;
  renk: string;
  wifiAdi: string | null;
  wifiSifre: string | null;
  sosyalMedya: Record<string, string> | null;
  aktif: boolean;
};

export type Kategori = {
  id: string;
  restoranId: string;
  isim: string;
  sira: number;
  urunler?: Urun[];
};

export type Urun = {
  id: string;
  kategoriId: string;
  isim: string;
  aciklama: string | null;
  fiyat: number;
  kalori: number | null;
  icerik: string | null;
  alerjenler: string | null;
  gorsel: string | null;
  aktif: boolean;
  sira: number;
};

export type Siparis = {
  id: string;
  restoranId: string;
  masaNo: string;
  urunler: SiparisUrun[];
  toplam: number;
  durum: string;
  notlar: string | null;
  createdAt: string;
};

export type SiparisUrun = {
  urunId: string;
  isim: string;
  adet: number;
  fiyat: number;
};
