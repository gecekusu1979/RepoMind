"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BusFactorResult, RepoMeta } from "@/types/repo";
import { calculateBusFactor } from "@/lib/contributors";
import { Users, AlertOctagon, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import Image from "next/image";

interface BusFactorCardProps {
    meta: RepoMeta;
}

export function BusFactorCard({ meta }: BusFactorCardProps) {
    const [result, setResult] = useState<BusFactorResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const fetchedRef = useRef(false);

    const fetchContributors = useCallback(async () => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        setLoading(true);

        try {
            const res = await fetch(`/api/contributors/${meta.owner}/${meta.name}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setResult(calculateBusFactor(data));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [meta.owner, meta.name]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    fetchContributors();
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [fetchContributors]);

    return (
        <div ref={containerRef} className="rounded-2xl border bg-white/[0.03] border-white/10 overflow-hidden relative p-5">
            <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white/80">Bus Factor / Yazar Riski</h3>
            </div>

            {loading && (
                <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-white/5 rounded w-1/3" />
                    <div className="h-8 bg-white/5 rounded-full w-full" />
                    <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/5" />
                        <div className="w-8 h-8 rounded-full bg-white/5" />
                    </div>
                </div>
            )}

            {error && (
                <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    Katkıda bulunanlar yüklenemedi. Rate limit aşılmış olabilir.
                </div>
            )}

            {result && result.topContributors.length > 0 && (
                <div className="space-y-5">
                    {/* Risk Alert */}
                    <div className="flex items-start gap-3 p-3 rounded-xl border" style={{ backgroundColor: result.color + "11", borderColor: result.color + "33" }}>
                        {result.risk === "Kritik Risk" && <AlertOctagon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: result.color }} />}
                        {result.risk === "Ortalama Risk" && <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: result.color }} />}
                        {result.risk === "Sağlıklı" && <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: result.color }} />}

                        <div>
                            <p className="text-sm font-semibold" style={{ color: result.color }}>{result.risk}</p>
                            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{result.advice}</p>
                        </div>
                    </div>

                    {/* Cumulative Share Bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-white/40">
                            <span>En Çok Katkı Sağlayanlar</span>
                            <span>{result.totalCommitsTop10} commit (Top 10)</span>
                        </div>
                        <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden flex">
                            {result.topContributors.map((c, i) => {
                                const width = Math.max(2, (c.contributions / result.totalCommitsTop10) * 100);
                                const lightness = 60 - i * 4;
                                return (
                                    <div
                                        key={c.login}
                                        style={{ width: `${width}%`, backgroundColor: `hsl(250, 70%, ${lightness}%)` }}
                                        className="h-full border-r border-black/20 hover:brightness-125 transition-all"
                                        title={`${c.login}: ${c.contributions} commits`}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Avatars */}
                    <div className="flex flex-wrap gap-2">
                        {result.topContributors.map(c => (
                            <a
                                key={c.login}
                                href={c.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative"
                            >
                                <img
                                    src={c.avatar_url}
                                    alt={c.login}
                                    className="w-8 h-8 rounded-full border border-white/10 group-hover:border-indigo-400 transition-colors"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-[#0f0f1a] border border-white/10 text-[9px] px-1 rounded-full text-white/60">
                                    {Math.round((c.contributions / result.totalCommitsTop10) * 100)}%
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {result && result.topContributors.length === 0 && (
                <div className="text-xs text-white/30 text-center py-4">Katkıda bulunan verisi mevcut değil.</div>
            )}
        </div>
    );
}

