-- AnalitikKayit: teslim edilen siparişlerin 30 günlük analitik deposu.
-- Siparis ve OdemeArsiv 24 saat sonra silinir; bu tablo 30 gün saklanır.

CREATE TABLE IF NOT EXISTS "AnalitikKayit" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "restoranId" TEXT NOT NULL,
  "siparisId"  TEXT,
  "masaNo"     TEXT NOT NULL,
  urunler      JSONB NOT NULL DEFAULT '[]',
  toplam       FLOAT NOT NULL DEFAULT 0,
  notlar       TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analitik_kayit_filter
  ON "AnalitikKayit" ("restoranId", "createdAt" DESC);

ALTER TABLE "AnalitikKayit" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "AnalitikKayit" FOR ALL USING (true);

-- Mevcut teslim edilmiş siparişleri tek seferlik taşı
INSERT INTO "AnalitikKayit" ("restoranId", "siparisId", "masaNo", urunler, toplam, notlar, "createdAt")
SELECT "restoranId", id, "masaNo", urunler, toplam, notlar, "createdAt"
FROM "Siparis"
WHERE durum = 'teslim'
ON CONFLICT DO NOTHING;
