-- Restoran tablosuna timezone kolonu ekle
ALTER TABLE "Restoran"
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul';
