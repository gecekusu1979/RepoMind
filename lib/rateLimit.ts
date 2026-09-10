import { NextRequest } from "next/server";

/**
 * Basit, bağımlılıksız, edge-uyumlu sabit-pencere rate limiter.
 *
 * NOT: Bu implementasyon süreç-içi (in-memory) bir Map kullanır. Tek bir
 * edge fonksiyon instance'ı için IP-başına aşırı isteği anında keser ve
 * GitHub'ın kendi rate limitini boşa harcanmaktan korur. Çok sayıda edge
 * instance'ı arasında paylaşılan/kesin bir limit gerekiyorsa (örn. Vercel'de
 * yüksek trafik), bunun yerine Upstash Redis / Vercel KV tabanlı bir
 * çözüme (örn. @upstash/ratelimit) geçilmesi önerilir.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Map'in sınırsız büyümesini önlemek için periyodik temizlik.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number) {
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}

function getClientIp(req: NextRequest): string {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0].trim();
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp;
    return "unknown";
}

export interface RateLimitResult {
    ok: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
}

/**
 * @param req Gelen istek (IP çıkarımı için)
 * @param routeKey Endpoint'i ayırt etmek için sabit bir anahtar (örn. "analyze")
 * @param limit Pencere başına izin verilen istek sayısı
 * @param windowMs Pencere süresi (ms)
 */
export function checkRateLimit(
    req: NextRequest,
    routeKey: string,
    limit = 20,
    windowMs = 60_000
): RateLimitResult {
    const now = Date.now();
    cleanup(now);

    const key = `${routeKey}:${getClientIp(req)}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs;
        buckets.set(key, { count: 1, resetAt });
        return { ok: true, limit, remaining: limit - 1, resetAt };
    }

    if (existing.count >= limit) {
        return { ok: false, limit, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return {
        ok: true,
        limit,
        remaining: limit - existing.count,
        resetAt: existing.resetAt,
    };
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
    return {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    };
}
