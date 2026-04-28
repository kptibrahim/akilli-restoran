-- ============================================================
-- AI Kullanım Tablosu + Restoran Paket Alanı
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

-- 1. Restoran tablosuna paket alanı ekle
ALTER TABLE "Restoran"
  ADD COLUMN IF NOT EXISTS "paket" TEXT DEFAULT 'profesyonel';

-- 2. AiKullanim tablosu — aylık kullanım sayacı
CREATE TABLE IF NOT EXISTS "AiKullanim" (
  "id"                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  "restoranId"        TEXT    NOT NULL,
  "ay"                TEXT    NOT NULL,  -- YYYY-MM formatı
  "chatbotMesaj"      INTEGER DEFAULT 0,
  "ceviriCagri"       INTEGER DEFAULT 0,
  "menuImport"        INTEGER DEFAULT 0,
  "toplamInputToken"  INTEGER DEFAULT 0,
  "toplamOutputToken" INTEGER DEFAULT 0,
  "toplamCacheRead"   INTEGER DEFAULT 0,
  "toplamMaliyet"     DECIMAL(10, 4) DEFAULT 0,
  "createdAt"         TIMESTAMPTZ DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ DEFAULT now()
);

-- 3. Unique constraint — restoranId + ay kombinasyonu tekil olmalı
ALTER TABLE "AiKullanim"
  DROP CONSTRAINT IF EXISTS "AiKullanim_restoranId_ay_key";
ALTER TABLE "AiKullanim"
  ADD CONSTRAINT "AiKullanim_restoranId_ay_key" UNIQUE ("restoranId", "ay");

-- 4. Performans index'i
CREATE INDEX IF NOT EXISTS "AiKullanim_restoranId_ay_idx"
  ON "AiKullanim" ("restoranId", "ay");

-- 5. RLS — sadece service role erişebilir (API route'lar adminDb kullanır)
ALTER TABLE "AiKullanim" ENABLE ROW LEVEL SECURITY;

-- Var olan policyler varsa kaldır
DROP POLICY IF EXISTS "AiKullanim_service_only" ON "AiKullanim";

-- Service role tüm işlemlere erişebilir
CREATE POLICY "AiKullanim_service_only"
  ON "AiKullanim"
  USING (auth.role() = 'service_role');
