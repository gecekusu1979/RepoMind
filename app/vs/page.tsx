"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { AnalyzeResponse, AnalysisResult } from "@/types/repo";
import { ScoreCard } from "@/components/ScoreCard";
import { Star, GitFork, Files, ExternalLink } from "lucide-react";

interface CompareCardProps {
    data: AnalyzeResponse | null;
    loading: boolean;
    winner: (metric: keyof AnalysisResult["metrics"] | "totalFiles" | "stars") => boolean;
}

function formatStars(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
}

function MetricCell({ val, wins }: { val: number | null; wins: boolean }) {
    return (
        <td className={`text-center py-2 px-3 text-sm font-semibold rounded-lg transition-colors
      ${wins ? "text-emerald-400 bg-emerald-500/10" : "text-white/60"}`}>
            {val === null ? "—" : val}
        </td>
    );
}

function MetricRow({
    label, a, b, higherIsBetter = true
}: { label: string; a: number | null; b: number | null; higherIsBetter?: boolean }) {
    const aWins = a !== null && b !== null && (higherIsBetter ? a > b : a < b);
    const bWins = a !== null && b !== null && (higherIsBetter ? b > a : b < a);

    return (
        <tr className="border-t border-white/5">
            <td className="py-2 px-3 text-xs text-white/40 font-medium">{label}</td>
            <MetricCell val={a} wins={aWins} />
            <td className="py-2 px-3 text-xs text-white/20 text-center">vs</td>
            <MetricCell val={b} wins={bWins} />
        </tr>
    );
}

function RepoColumn({ data, loading, label }: { data: AnalyzeResponse | null; loading: boolean; label: string }) {
    if (loading) {
        return (
            <div className="flex-1 space-y-3 animate-pulse">
                <div className="h-8 bg-white/5 rounded-xl" />
                <div className="h-4 bg-white/5 rounded-xl w-2/3" />
                <div className="h-32 bg-white/5 rounded-2xl" />
            </div>
        );
    }
    if (!data) {
        return (
            <div className="flex-1 flex items-center justify-center h-48 text-white/20 text-sm border border-white/5 rounded-2xl">
                {label}
            </div>
        );
    }

    const { meta, analysis } = data;

    return (
        <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="space-y-1">
                <a
                    href={meta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 group"
                >
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {meta.fullName}
                    </h3>
                    <ExternalLink className="w-3.5 h-3.5 text-white/30 group-hover:text-indigo-400 flex-shrink-0" />
                </a>
                {meta.description && (
                    <p className="text-xs text-white/40 line-clamp-2">{meta.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{formatStars(meta.stars)}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{meta.forks}</span>
                    <span className="flex items-center gap-1"><Files className="w-3 h-3" />{analysis.totalFiles}</span>
                    {meta.language && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40">{meta.language}</span>
                    )}
                </div>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-2">
                <ScoreCard label="Test" score={analysis.metrics.testScore} icon="🧪" description="Test dosyaları / kaynak dosyaları oranı" color="#ec4899" />
                <ScoreCard label="Doküman" score={analysis.metrics.docScore} icon="📚" description="README, lisans, katkıda bulunma rehberi" color="#8b5cf6" />
                <ScoreCard label="Sağlık" score={analysis.metrics.healthScore} icon="💊" description="Yapı, linter ve konfigürasyon sağlığı" color="#22c55e" />
                <ScoreCard label="Genel" score={analysis.metrics.overall} icon="🏆" description="Ağırlıklı ortalama genel skor" color="#f59e0b" />
            </div>

            {/* Activity */}
            <div
                className="text-xs px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5"
                style={{
                    color: analysis.activity.color,
                    borderColor: analysis.activity.color + "33",
                    backgroundColor: analysis.activity.color + "11",
                }}
            >
                {analysis.activity.emoji} {analysis.activity.status}
            </div>

            {/* Architecture layers */}
            <div className="space-y-1">
                <p className="text-xs text-white/25 font-medium uppercase tracking-widest">Katmanlar</p>
                <div className="flex flex-wrap gap-1.5">
                    {analysis.architecture.filter(b => b.name !== "Other").map((b) => (
                        <span
                            key={b.name}
                            className="text-xs px-2 py-0.5 rounded-lg border"
                            style={{ color: b.color, borderColor: b.color + "44", backgroundColor: b.color + "11" }}
                        >
                            {b.icon} {b.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface AnalyzeInput {
    url: string;
    setData: (d: AnalyzeResponse | null) => void;
    setLoading: (v: boolean) => void;
    setError: (e: string | null) => void;
}

async function fetchAnalysis({ url, setData, setLoading, setError }: AnalyzeInput) {
    setLoading(true);
    setError(null);
    setData(null);
    try {
        const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url.includes("/") ? url : `https://github.com/${url}` }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Analiz başarısız");
        setData(json as AnalyzeResponse);
    } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Bilinmeyen hata");
    } finally {
        setLoading(false);
    }
}

const DEMO_PAIRS = [
    ["expressjs/express", "honojs/hono"],
    ["pmndrs/zustand", "reduxjs/redux"],
    ["vitejs/vite", "webpack/webpack"],
    ["prisma/prisma", "drizzle-team/drizzle-orm"],
];

export default function VsPage() {
    const [urlA, setUrlA] = useState("");
    const [urlB, setUrlB] = useState("");
    const [dataA, setDataA] = useState<AnalyzeResponse | null>(null);
    const [dataB, setDataB] = useState<AnalyzeResponse | null>(null);
    const [loadingA, setLoadingA] = useState(false);
    const [loadingB, setLoadingB] = useState(false);
    const [errorA, setErrorA] = useState<string | null>(null);
    const [errorB, setErrorB] = useState<string | null>(null);

    const handleCompare = useCallback(() => {
        if (urlA.trim()) {
            fetchAnalysis({ url: urlA.trim(), setData: setDataA, setLoading: setLoadingA, setError: setErrorA });
        }
        if (urlB.trim()) {
            fetchAnalysis({ url: urlB.trim(), setData: setDataB, setLoading: setLoadingB, setError: setErrorB });
        }
    }, [urlA, urlB]);

    const loadDemo = (pair: [string, string]) => {
        setUrlA(pair[0]);
        setUrlB(pair[1]);
    };

    const winnerOf = (getVal: (d: AnalyzeResponse) => number, higherIsBetter = true) => {
        if (!dataA || !dataB) return { a: false, b: false };
        const a = getVal(dataA);
        const b = getVal(dataB);
        if (a === b) return { a: false, b: false };
        const aWins = higherIsBetter ? a > b : a < b;
        return { a: aWins, b: !aWins };
    };

    return (
        <div className="min-h-screen bg-[#060610] text-white">
            {/* Header */}
            <div className="border-b border-white/5 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <span className="text-xs font-bold text-white">R</span>
                        </div>
                        <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">RepoMind</span>
                    </Link>
                    <span className="text-white/20">/</span>
                    <span className="text-sm font-semibold text-white/80">⚡ Karşılaştır</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
                {/* Title */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
                        Depo Karşılaştırma
                    </h1>
                    <p className="text-white/40 text-sm">İki GitHub deposunu kalite metrikleri üzerinden yan yana karşılaştır</p>
                </div>

                {/* Demo pairs */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-xs text-white/25">Dene:</span>
                    {DEMO_PAIRS.map(([a, b]) => (
                        <button
                            key={`${a}-${b}`}
                            onClick={() => loadDemo([a, b])}
                            className="text-xs px-3 py-1 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white/80 transition-all"
                        >
                            {a.split("/")[1]} vs {b.split("/")[1]}
                        </button>
                    ))}
                </div>

                {/* Input row */}
                <div className="flex items-center gap-3">
                    <input
                        value={urlA}
                        onChange={(e) => setUrlA(e.target.value)}
                        placeholder="owner/repo veya GitHub URL"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
                    />
                    <span className="text-white/30 font-bold text-lg flex-shrink-0">vs</span>
                    <input
                        value={urlB}
                        onChange={(e) => setUrlB(e.target.value)}
                        placeholder="owner/repo veya GitHub URL"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
                    />
                    <button
                        onClick={handleCompare}
                        disabled={!urlA.trim() && !urlB.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex-shrink-0"
                    >
                        Karşılaştır
                    </button>
                </div>

                {/* Error display */}
                {(errorA || errorB) && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>{errorA && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errorA}</p>}</div>
                        <div>{errorB && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{errorB}</p>}</div>
                    </div>
                )}

                {/* Comparison layout */}
                {(dataA || dataB || loadingA || loadingB) && (
                    <div className="space-y-6">
                        {/* Side by side cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-start">
                            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                                <RepoColumn data={dataA} loading={loadingA} label="Sol depo bekleniyor…" />
                            </div>
                            <div className="flex items-center justify-center lg:py-8">
                                <span className="text-white/20 font-black text-xl">⚡</span>
                            </div>
                            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                                <RepoColumn data={dataB} loading={loadingB} label="Sağ depo bekleniyor…" />
                            </div>
                        </div>

                        {/* Comparison table */}
                        {dataA && dataB && (
                            <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
                                <div className="px-5 py-3 border-b border-white/5">
                                    <h3 className="text-sm font-semibold text-white/60">📊 Metrik Karşılaştırması</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                <th className="py-2 px-3 text-xs text-white/25 font-medium text-left">Metrik</th>
                                                <th className="py-2 px-3 text-xs text-white/50 font-semibold text-center truncate max-w-[120px]">
                                                    {dataA.meta.name}
                                                </th>
                                                <th className="py-2 px-3 text-xs text-white/20 font-medium text-center">—</th>
                                                <th className="py-2 px-3 text-xs text-white/50 font-semibold text-center truncate max-w-[120px]">
                                                    {dataB.meta.name}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <MetricRow
                                                label="⭐ Yıldız"
                                                a={dataA.meta.stars}
                                                b={dataB.meta.stars}
                                            />
                                            <MetricRow
                                                label="🍴 Fork"
                                                a={dataA.meta.forks}
                                                b={dataB.meta.forks}
                                            />
                                            <MetricRow
                                                label="📂 Dosya Sayısı"
                                                a={dataA.analysis.totalFiles}
                                                b={dataB.analysis.totalFiles}
                                                higherIsBetter={false}
                                            />
                                            <MetricRow
                                                label="🧪 Test Skoru"
                                                a={dataA.analysis.metrics.testScore}
                                                b={dataB.analysis.metrics.testScore}
                                            />
                                            <MetricRow
                                                label="📚 Dokümantasyon"
                                                a={dataA.analysis.metrics.docScore}
                                                b={dataB.analysis.metrics.docScore}
                                            />
                                            <MetricRow
                                                label="💊 Kod Sağlığı"
                                                a={dataA.analysis.metrics.healthScore}
                                                b={dataB.analysis.metrics.healthScore}
                                            />
                                            <MetricRow
                                                label="🏆 Genel Skor"
                                                a={dataA.analysis.metrics.overall}
                                                b={dataB.analysis.metrics.overall}
                                            />
                                            <MetricRow
                                                label="🔥 Aktivite Skoru"
                                                a={dataA.analysis.activity.activityScore}
                                                b={dataB.analysis.activity.activityScore}
                                            />
                                            <MetricRow
                                                label="🐛 Açık Issue"
                                                a={dataA.meta.openIssues}
                                                b={dataB.meta.openIssues}
                                                higherIsBetter={false}
                                            />
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
