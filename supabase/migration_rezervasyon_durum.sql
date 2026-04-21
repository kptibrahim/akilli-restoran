-- Rezervasyon tablosuna durum, kaynak ve olusturuldu kolonları ekle
ALTER TABLE "Rezervasyon"
  ADD COLUMN IF NOT EXISTS durum TEXT NOT NULL DEFAULT 'bekliyor',
  ADD COLUMN IF NOT EXISTS kaynak TEXT NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS olusturuldu TIMESTAMPTZ DEFAULT NOW();
