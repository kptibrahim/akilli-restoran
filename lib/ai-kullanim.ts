import { adminDb } from "@/lib/supabase-admin";
import { getRestoranPaketi, PAKET_OZELLIKLERI } from "@/lib/paket-limitleri";

export const PAKET_LIMITLER = {
  ucretsiz:    { chatbotMesaj: 0,     ceviriCagri: 0,      menuImport: 0   },
  baslangic:   { chatbotMesaj: 0,     ceviriCagri: 0,      menuImport: 0   },
  profesyonel: { chatbotMesaj: 5000,  ceviriCagri: 10000,  menuImport: 20  },
  premium:     { chatbotMesaj: 25000, ceviriCagri: 50000,  menuImport: 100 },
} as const;

type Paket = keyof typeof PAKET_LIMITLER;
type Tip = "chatbot" | "ceviri" | "import";

// USD/M token maliyetleri
const MODEL_MALIYET = {
  "sonnet-4-6": { input: 3, output: 15, cacheRead: 0.3, cacheCreate: 3.75 },
  "haiku-4-5":  { input: 1, output: 5,  cacheRead: 0,   cacheCreate: 0    },
} as const;

function hesaplaMaliyet(params: {
  model: "sonnet-4-6" | "haiku-4-5";
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}): number {
  const m = MODEL_MALIYET[params.model];
  const doviz = parseFloat(process.env.EXCHANGE_RATE_USD_TRY ?? "40");
  const usd =
    (params.inputTokens / 1_000_000) * m.input +
    (params.outputTokens / 1_000_000) * m.output +
    ((params.cacheReadTokens ?? 0) / 1_000_000) * m.cacheRead +
    ((params.cacheCreationTokens ?? 0) / 1_000_000) * m.cacheCreate;
  return parseFloat((usd * doviz).toFixed(4));
}

function buAy(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function kayitEkle(params: {
  restoranId: string;
  tip: Tip;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  model: "sonnet-4-6" | "haiku-4-5";
}): Promise<void> {
  const ay = buAy();
  const maliyet = hesaplaMaliyet(params);

  type KullanımRow = {
    id: string;
    chatbotMesaj: number;
    ceviriCagri: number;
    menuImport: number;
    toplamInputToken: number;
    toplamOutputToken: number;
    toplamCacheRead: number;
    toplamCacheCreate: number;
    toplamMaliyet: number;
  };

  const { data: mevcut } = await adminDb
    .from("AiKullanim")
    .select("id, chatbotMesaj, ceviriCagri, menuImport, toplamInputToken, toplamOutputToken, toplamCacheRead, toplamCacheCreate, toplamMaliyet")
    .eq("restoranId", params.restoranId)
    .eq("ay", ay)
    .single();

  if (mevcut) {
    const row = mevcut as KullanımRow;
    await adminDb
      .from("AiKullanim")
      .update({
        chatbotMesaj: row.chatbotMesaj + (params.tip === "chatbot" ? 1 : 0),
        ceviriCagri:  row.ceviriCagri  + (params.tip === "ceviri"  ? 1 : 0),
        menuImport:   row.menuImport   + (params.tip === "import"   ? 1 : 0),
        toplamInputToken:   row.toplamInputToken   + params.inputTokens,
        toplamOutputToken:  row.toplamOutputToken  + params.outputTokens,
        toplamCacheRead:    row.toplamCacheRead    + (params.cacheReadTokens    ?? 0),
        toplamCacheCreate:  row.toplamCacheCreate  + (params.cacheCreationTokens ?? 0),
        toplamMaliyet: parseFloat((row.toplamMaliyet + maliyet).toFixed(4)),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", row.id);
  } else {
    await adminDb.from("AiKullanim").insert({
      restoranId:         params.restoranId,
      ay,
      chatbotMesaj:       params.tip === "chatbot" ? 1 : 0,
      ceviriCagri:        params.tip === "ceviri"  ? 1 : 0,
      menuImport:         params.tip === "import"   ? 1 : 0,
      toplamInputToken:   params.inputTokens,
      toplamOutputToken:  params.outputTokens,
      toplamCacheRead:    params.cacheReadTokens    ?? 0,
      toplamCacheCreate:  params.cacheCreationTokens ?? 0,
      toplamMaliyet:      maliyet,
    });
  }
}

export async function limitKontrol(
  restoranId: string,
  tip: Tip
): Promise<{ izinVar: boolean; kullanildi: number; limit: number; paket: string }> {
  const paket = await getRestoranPaketi(restoranId);
  const ozellikler = PAKET_OZELLIKLERI[paket];

  // Feature flag — AI özelliği bu pakette kapalıysa
  const aiFlag: Record<Tip, boolean> = {
    chatbot: ozellikler.aiChatbot,
    ceviri:  ozellikler.aiCeviri,
    import:  ozellikler.aiMenuImport,
  };
  if (!aiFlag[tip]) return { izinVar: false, kullanildi: 0, limit: 0, paket };

  const aylikLimit: Record<Tip, number> = {
    chatbot: ozellikler.chatbotMesajAylik,
    ceviri:  10000,
    import:  20,
  };
  const limit = aylikLimit[tip];
  if (limit === -1) return { izinVar: true, kullanildi: 0, limit: -1, paket };

  const alanAdi: Record<Tip, string> = {
    chatbot: "chatbotMesaj",
    ceviri:  "ceviriCagri",
    import:  "menuImport",
  };

  const ay = buAy();
  const { data: kullanim } = await adminDb
    .from("AiKullanim")
    .select(alanAdi[tip])
    .eq("restoranId", restoranId)
    .eq("ay", ay)
    .single();

  const kullanildi = (kullanim as Record<string, number> | null)?.[alanAdi[tip]] ?? 0;

  return { izinVar: kullanildi < limit, kullanildi, limit, paket };
}
