"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GitHubIssue, RepoMeta } from "@/types/repo";
import { formatTimeAgo } from "@/lib/issues";
import { HeartHandshake, MessageSquare, ExternalLink, Activity } from "lucide-react";

interface GoodFirstIssuesProps {
    meta: RepoMeta;
}

export function GoodFirstIssues({ meta }: GoodFirstIssuesProps) {
    const [issues, setIssues] = useState<GitHubIssue[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const fetchedRef = useRef(false);

    const fetchIssues = useCallback(async () => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        setLoading(true);

        try {
            const res = await fetch(`/api/issues/${meta.owner}/${meta.name}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setIssues(data);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [meta.owner, meta.name]);

    useEffect(() => {
        // IntersectionObserver for rate-limit protection (Lazy load)
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    fetchIssues();
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [fetchIssues]);

    return (
        <div ref={containerRef} className="rounded-2xl border bg-white/[0.03] border-white/10 overflow-hidden p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
                <HeartHandshake className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white/80">Yeni Başlayanlar İçin Issue'lar</h3>
            </div>

            {loading && (
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-xl border border-white/5" />
                    ))}
                </div>
            )}

            {error && (
                <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    Issue verileri alınamadı.
                </div>
            )}

            {issues && issues.length > 0 && (
                <div className="space-y-2.5">
                    {issues.map(issue => (
                        <a
                            key={issue.id}
                            href={issue.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
                        >
                            <h4 className="text-sm font-semibold text-white/80 group-hover:text-emerald-300 transition-colors line-clamp-1">
                                {issue.title}
                            </h4>
                            <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-white/30">#{issue.number}</span>
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="w-3.5 h-3.5" /> {issue.comments}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>{formatTimeAgo(issue.created_at)}</span>
                                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400" />
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            )}

            {issues && issues.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <Activity className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-emerald-400 mb-1">Harika Haber!</p>
                    <p className="text-xs text-white/50 max-w-[200px]">Şu an açık 'good first issue' bulunmuyor var olanların çoğu çözülmüş.</p>
                </div>
            )}
        </div>
    );
}
