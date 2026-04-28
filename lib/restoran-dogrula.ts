import { adminDb } from "@/lib/supabase-admin";

export type RestoranBasic = {
  id: string;
  slug: string;
  isim: string;
  aktif: boolean;
};

// 5 dakika TTL in-memory cache — küçük ve kritik değil, kabul edilebilir
const cache = new Map<string, { restoran: RestoranBasic; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function validateRestoranId(restoranId: string): Promise<RestoranBasic | null> {
  if (!restoranId?.trim()) return null;

  const cached = cache.get(restoranId);
  if (cached && cached.expiresAt > Date.now()) return cached.restoran;

  const { data } = await adminDb
    .from("Restoran")
    .select("id, slug, isim, aktif")
    .eq("id", restoranId)
    .single();

  if (!data || !(data as RestoranBasic).aktif) {
    cache.delete(restoranId);
    return null;
  }

  const restoran = data as RestoranBasic;
  cache.set(restoranId, { restoran, expiresAt: Date.now() + CACHE_TTL });
  return restoran;
}

export async function validateRestoranSlug(slug: string): Promise<RestoranBasic | null> {
  if (!slug?.trim()) return null;

  const cacheKey = `slug:${slug}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.restoran;

  const { data } = await adminDb
    .from("Restoran")
    .select("id, slug, isim, aktif")
    .eq("slug", slug)
    .single();

  if (!data || !(data as RestoranBasic).aktif) {
    cache.delete(cacheKey);
    return null;
  }

  const restoran = data as RestoranBasic;
  cache.set(cacheKey, { restoran, expiresAt: Date.now() + CACHE_TTL });
  return restoran;
}
