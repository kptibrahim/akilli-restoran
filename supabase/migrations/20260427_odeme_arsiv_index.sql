-- OdemeArsiv tablosunda restoranId filtresine index ekle
-- Supabase Realtime filtered subscriptions için gerekli (ve genel sorgu performansı)
CREATE INDEX IF NOT EXISTS idx_odeme_arsiv_restoran_id ON "OdemeArsiv" ("restoranId");
CREATE INDEX IF NOT EXISTS idx_odeme_arsiv_filter ON "OdemeArsiv" ("restoranId", "odendi", "createdAt" DESC);
