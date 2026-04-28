-- Siparis tablosunu realtime publication'a ekle (yoksa)
ALTER PUBLICATION supabase_realtime ADD TABLE "Siparis";

-- UPDATE/DELETE olaylarında tüm sütunları payload'a ekle
-- (Olmadan sadece primary key gelir, filtreler çalışmaz)
ALTER TABLE "Siparis" REPLICA IDENTITY FULL;

-- OdemeArsiv için de aynısı (Kasa realtime için)
ALTER TABLE "OdemeArsiv" REPLICA IDENTITY FULL;
