-- OdemeArsiv tablosunu oluştur
CREATE TABLE IF NOT EXISTS "OdemeArsiv" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "restoranId"    TEXT NOT NULL,
  "siparisId"     TEXT,
  "masaNo"        TEXT NOT NULL,
  urunler         JSONB NOT NULL DEFAULT '[]',
  toplam          FLOAT NOT NULL DEFAULT 0,
  "odemeYontemi"  TEXT,
  "odemeAlanKisi" TEXT,
  "not"           TEXT,
  odendi          BOOLEAN NOT NULL DEFAULT false,
  "odendiTarih"   TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_odeme_restoran FOREIGN KEY ("restoranId") REFERENCES "Restoran"(id) ON DELETE CASCADE
);

-- İndeks
CREATE INDEX IF NOT EXISTS idx_odeme_arsiv_filter ON "OdemeArsiv"("restoranId", odendi, "createdAt");

-- RLS
ALTER TABLE "OdemeArsiv" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "OdemeArsiv" FOR ALL USING (true);

-- Realtime'a ekle
ALTER PUBLICATION supabase_realtime ADD TABLE "Siparis";
ALTER PUBLICATION supabase_realtime ADD TABLE "OdemeArsiv";
