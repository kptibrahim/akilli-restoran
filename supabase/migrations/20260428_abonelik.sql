-- Abonelik tablosu
CREATE TABLE IF NOT EXISTS "Abonelik" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restoranId"     TEXT NOT NULL,
  "paket"          TEXT NOT NULL DEFAULT 'profesyonel',
  "durum"          TEXT NOT NULL DEFAULT 'aktif',
  "baslangicTarih" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "bitisTarih"     TIMESTAMPTZ,
  "denemeBitis"    TIMESTAMPTZ,
  "iptalSebep"     TEXT,
  "notlar"         TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "Abonelik_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Abonelik_restoranId_key" UNIQUE ("restoranId"),
  CONSTRAINT "Abonelik_restoranId_fkey"
    FOREIGN KEY ("restoranId") REFERENCES "Restoran"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Abonelik_restoranId_durum_idx"
  ON "Abonelik" ("restoranId", "durum");

-- Mevcut tüm restoranlar için pilot abonelik kaydı oluştur
INSERT INTO "Abonelik" ("id", "restoranId", "paket", "durum", "notlar", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  r."id",
  'profesyonel',
  'aktif',
  'Pilot dönem - ücretsiz erişim',
  now(),
  now()
FROM "Restoran" r
WHERE NOT EXISTS (
  SELECT 1 FROM "Abonelik" a WHERE a."restoranId" = r."id"
);
