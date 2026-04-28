-- Supabase Realtime filtreli subscription için restoranId index'i zorunlu.
-- Yoksa .subscribe() CHANNEL_ERROR dönüyor, bağlantı hiç kurulamıyor.
CREATE INDEX IF NOT EXISTS idx_siparis_restoran_id ON "Siparis" ("restoranId");
