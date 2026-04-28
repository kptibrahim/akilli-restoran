-- Realtime subscription için Siparis tablosuna SELECT policy ekle.
-- Browser client (authenticated user) kendi restoranının siparişlerini
-- okuyabilmeli; aksi hâlde Supabase Realtime WebSocket bağlantısı düşüyor.

DROP POLICY IF EXISTS "auth_select_own_siparis" ON "Siparis";

CREATE POLICY "auth_select_own_siparis" ON "Siparis"
FOR SELECT
USING (
  "restoranId" IN (
    SELECT id FROM "Restoran"
    WHERE "userId" = auth.uid()::text
  )
);
