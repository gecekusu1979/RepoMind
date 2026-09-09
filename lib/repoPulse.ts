/**
 * lib/repoPulse.ts
 * Client-side type definitions and classification constants for the Zombie Repo pulse feature.
 */

import { PulseStatus } from "@/types/repo";

export const PULSE_THRESHOLDS = {
    active: 60,   // < 60 days → active
    low: 180,     // 60–180 days → low activity
} as const;

export function classifyPulse(daysSinceLastCommit: number): PulseStatus {
    if (daysSinceLastCommit < PULSE_THRESHOLDS.active) return "active";
    if (daysSinceLastCommit < PULSE_THRESHOLDS.low) return "low";
    return "zombie";
}

export const PULSE_CONFIG: Record<
    PulseStatus,
    { label: string; emoji: string; color: string; bgClass: string; borderClass: string }
> = {
    active: {
        label: "Aktif / Canlı",
        emoji: "🟢",
        color: "#22c55e",
        bgClass: "bg-emerald-500/10",
        borderClass: "border-emerald-500/20",
    },
    low: {
        label: "Düşük Aktivite",
        emoji: "🟡",
        color: "#f59e0b",
        bgClass: "bg-amber-500/10",
        borderClass: "border-amber-500/20",
    },
    zombie: {
        label: "Terk Edilmiş",
        emoji: "⚠️",
        color: "#ef4444",
        bgClass: "bg-red-500/10",
        borderClass: "border-red-500/20",
    },
};
