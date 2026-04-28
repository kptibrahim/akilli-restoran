export type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: Date;
};

// Fixed window counter using Vercel KV.
// KV_REST_API_URL ayarlı değilse (local/dev) rate limiting atlanır.
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number = 3600
): Promise<RateLimitResult> {
  const resetAt = new Date(
    (Math.floor(Date.now() / (windowSec * 1000)) + 1) * windowSec * 1000
  );

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return { success: true, remaining: limit, resetAt };
  }

  try {
    const { kv } = await import("@vercel/kv");
    const kvKey = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
    const count = await kv.incr(kvKey);
    if (count === 1) await kv.expire(kvKey, windowSec);

    if (count > limit) {
      return { success: false, remaining: 0, resetAt };
    }
    return { success: true, remaining: limit - count, resetAt };
  } catch (err) {
    console.error("[rate-limit] KV hatası, atlanıyor:", err);
    return { success: true, remaining: limit, resetAt };
  }
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.floor(result.resetAt.getTime() / 1000).toString(),
  };
}
