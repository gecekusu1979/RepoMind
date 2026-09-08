import { ActivityResult, ActivityStatus } from "@/types/repo";

// ─────────────────────────────────────────────────────────────────
// Activity Detection
// ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
    ActivityStatus,
    { color: string; emoji: string }
> = {
    "Aktif Geliştirme": { color: "#22c55e", emoji: "🟢" },
    "Düşük Aktivite": { color: "#f59e0b", emoji: "🟡" },
    "Terk Edilmiş (Stale)": { color: "#ef4444", emoji: "🔴" },
    "Yeni Proje": { color: "#8b5cf6", emoji: "🟣" },
};

export function checkActivity(updatedAt: string, createdAt: string): ActivityResult {
    const now = Date.now();
    const updated = new Date(updatedAt).getTime();
    const created = new Date(createdAt).getTime();
    const daysSinceUpdate = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
    const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    let status: ActivityStatus;
    let activityScore: number;

    if (ageDays < 30) {
        // Very new project
        status = "Yeni Proje";
        activityScore = 90;
    } else if (daysSinceUpdate < 30) {
        status = "Aktif Geliştirme";
        // Score decays slightly with age relative to how recent the update is
        activityScore = Math.max(75, 100 - Math.floor(daysSinceUpdate * 0.8));
    } else if (daysSinceUpdate < 180) {
        // 1–6 months
        status = "Aktif Geliştirme";
        activityScore = Math.max(50, 74 - Math.floor((daysSinceUpdate - 30) * 0.4));
    } else if (daysSinceUpdate < 365) {
        // 6–12 months
        status = "Düşük Aktivite";
        activityScore = Math.max(20, 49 - Math.floor((daysSinceUpdate - 180) * 0.15));
    } else {
        // > 12 months
        status = "Terk Edilmiş (Stale)";
        // Harder decay
        activityScore = Math.max(0, 20 - Math.floor((daysSinceUpdate - 365) / 30));
    }

    const { color, emoji } = STATUS_CONFIG[status];

    return {
        status,
        activityScore,
        daysSinceUpdate,
        color,
        emoji,
    };
}

export function formatDaysAgo(days: number): string {
    if (days === 0) return "bugün";
    if (days === 1) return "dün";
    if (days < 30) return `${days} gün önce`;
    if (days < 365) return `${Math.round(days / 30)} ay önce`;
    const years = Math.floor(days / 365);
    const months = Math.round((days % 365) / 30);
    if (months === 0) return `${years} yıl önce`;
    return `${years} yıl ${months} ay önce`;
}
