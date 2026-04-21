-- Çeviri altyapısı için migration
-- Supabase Dashboard → SQL Editor'da çalıştırın

ALTER TABLE "Urun"     ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';
ALTER TABLE "Kategori" ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';
ALTER TABLE "Restoran" ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';
ALTER TABLE "Restoran" ADD COLUMN IF NOT EXISTS "selectedLanguages" TEXT[] DEFAULT ARRAY['tr']::TEXT[];
