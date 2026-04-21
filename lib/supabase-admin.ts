import { createClient } from "@supabase/supabase-js";

// Service role key — RLS'yi atlar, sadece API route'larında kullan
export const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
