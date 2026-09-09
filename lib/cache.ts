import { AnalyzeResponse, CachedAnalysis, RecentRepo } from "@/types/repo";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_PREFIX = "repomind:analysis:";
const RECENTS_KEY = "repomind:recents";
const MAX_RECENTS = 5;

function isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
}


export function getCached(fullName: string): AnalyzeResponse | null {
    if (!isBrowser()) return null;
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + fullName);
        if (!raw) return null;
        const cached: CachedAnalysis = JSON.parse(raw);
        if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
            localStorage.removeItem(CACHE_PREFIX + fullName);
            return null;
        }
        return cached.data;
    } catch {
        return null;
    }
}

export function setCached(fullName: string, data: AnalyzeResponse): void {
    if (!isBrowser()) return;
    try {
        const entry: CachedAnalysis = { data, cachedAt: Date.now() };
        localStorage.setItem(CACHE_PREFIX + fullName, JSON.stringify(entry));
        updateRecents(fullName, data);
    } catch {
    }
}

export function clearCached(fullName: string): void {
    if (!isBrowser()) return;
    try {
        localStorage.removeItem(CACHE_PREFIX + fullName);
    } catch {
    }
}

export function getCacheTTLRemaining(fullName: string): number | null {
    if (!isBrowser()) return null;
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + fullName);
        if (!raw) return null;
        const cached: CachedAnalysis = JSON.parse(raw);
        const remaining = CACHE_TTL_MS - (Date.now() - cached.cachedAt);
        return remaining > 0 ? remaining : null;
    } catch {
        return null;
    }
}


function updateRecents(fullName: string, data: AnalyzeResponse): void {
    if (!isBrowser()) return;
    try {
        const existing = getRecents();
        const filtered = existing.filter((r) => r.fullName !== fullName);
        const entry: RecentRepo = {
            fullName,
            cachedAt: Date.now(),
            stars: data.meta.stars,
            language: data.meta.language,
        };
        const updated = [entry, ...filtered].slice(0, MAX_RECENTS);
        localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
    } catch {
    }
}

export function getRecents(): RecentRepo[] {
    if (!isBrowser()) return [];
    try {
        const raw = localStorage.getItem(RECENTS_KEY);
        if (!raw) return [];
        const items: RecentRepo[] = JSON.parse(raw);
        return items.filter((r) => Date.now() - r.cachedAt < CACHE_TTL_MS);
    } catch {
        return [];
    }
}

export function removeRecent(fullName: string): void {
    if (!isBrowser()) return;
    try {
        const updated = getRecents().filter((r) => r.fullName !== fullName);
        localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
        localStorage.removeItem(CACHE_PREFIX + fullName);
    } catch {
    }
}

export function formatTTL(ms: number): string {
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 1) return "< 1 dk";
    return `${minutes} dk`;
}
