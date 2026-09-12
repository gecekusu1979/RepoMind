"use client";

import { useRef, useState, useEffect } from "react";
import { PulseResult } from "@/types/repo";
import { PULSE_CONFIG } from "@/lib/repoPulse";
import { Activity } from "lucide-react";

interface RepoPulseBadgeProps {
    owner: string;
    repo: string;
}

export function RepoPulseBadge({ owner, repo }: RepoPulseBadgeProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [pulse, setPulse] = useState<PulseResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !fetched) {
                    setFetched(true);
                    setLoading(true);
                    fetch(`/api/pulse/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
                        .then((r) => (r.ok ? r.json() : null))
                        .then((data: PulseResult | null) => {
                            if (data && "status" in data) setPulse(data);
                        })
                        .catch(() => null)
                        .finally(() => setLoading(false));
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [owner, repo, fetched]);

    return (
        <div ref={ref}>
            {loading && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 rounded-full text-xs text-zinc-900/30 dark:text-white/30 animate-pulse">
                    <Activity className="w-3 h-3" />
                    <span>Pulse yükleniyor…</span>
                </div>
            )}
            {!loading && pulse && (() => {
                const cfg = PULSE_CONFIG[pulse.status];
                const isZombie = pulse.status === "zombie";
                return (
                    <div
                        title={`Son commit: ${new Date(pulse.lastCommitDate).toLocaleDateString("tr-TR")}`}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all ${cfg.bgClass} ${cfg.borderClass}`}
                        style={{ color: cfg.color }}
                    >
                        <span>{cfg.emoji}</span>
                        <span>
                            {isZombie
                                ? `⚠️ Terk Edilmiş (${pulse.daysSinceLastCommit} gün)`
                                : `${cfg.label} (${pulse.daysSinceLastCommit} gün)`}
                        </span>
                    </div>
                );
            })()}
        </div>
    );
}
