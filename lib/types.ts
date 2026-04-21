// translations: { "en": { "isim": "...", "aciklama": "..." }, "ru": {...} }
export type Translations = Record<string, Record<string, string>>;

export type Urun = {
  id: string;
  isim: string;
  aciklama: string | null;
  fiyat: number;
  kalori: number | null;
  icerik: string | null;
  alerjenler: string | null;
  gorsel: string | null;
  translations?: Translations;
};

export type Kategori = {
  id: string;
  isim: string;
  urunler: Urun[];
  translations?: Translations;
};

export type SepetItem = {
  urun: Urun;
  adet: number;
};
