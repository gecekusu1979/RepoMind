"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, Copy, Shield } from "lucide-react";

interface BadgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    owner: string;
    repo: string;
}

type MetricType = "health" | "test" | "doc";
type FormatType = "markdown" | "html" | "url";

const METRIC_LABELS: Record<MetricType, string> = {
    health: "Health Score",
    test: "Test Coverage",
    doc: "Documentation",
};

export default function BadgeModal({ isOpen, onClose, owner, repo }: BadgeModalProps) {
    const [metric, setMetric] = useState<MetricType>("health");
    const [format, setFormat] = useState<FormatType>("markdown");
    const [copied, setCopied] = useState(false);
    const [origin, setOrigin] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        if (typeof window !== "undefined") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOrigin(window.location.origin);
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const badgeUrl = `${origin}/api/badge/${owner}/${repo}?metric=${metric}`;
    const targetUrl = `${origin}/?url=https://github.com/${owner}/${repo}`;
    const label = METRIC_LABELS[metric];

    const codeSnippets: Record<FormatType, string> = {
        markdown: `[![RepoMind ${label}](${badgeUrl})](${targetUrl})`,
        html: `<a href="${targetUrl}"><img src="${badgeUrl}" alt="RepoMind ${label}" /></a>`,
        url: badgeUrl,
    };

    const activeSnippet = codeSnippets[format];

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(activeSnippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
        }
    };

    return createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div
                className="w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-6 relative max-h-[90vh] overflow-y-auto no-scrollbar"
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
                autoFocus
            >
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-400" />
                        <h3 id="modal-title" className="text-base font-bold text-zinc-100">README Rozeti Al</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Canlı Önizleme */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Canlı Önizleme</label>
                    <div className="h-16 flex items-center justify-center bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/badge/${owner}/${repo}?metric=${metric}`} alt="Badge Preview" className="h-5" />
                    </div>
                </div>

                {/* Metrik Seçici */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Metrik Türü</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(["health", "test", "doc"] as MetricType[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMetric(m)}
                                className={`py-2 px-3 text-xs font-medium rounded-lg border transition ${metric === m
                                    ? "bg-indigo-600/10 border-indigo-500 text-indigo-300"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                                    }`}
                            >
                                {METRIC_LABELS[m]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Format Seçici & Kod Alanı */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Format</label>
                        <div className="flex gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                            {(["markdown", "html", "url"] as FormatType[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFormat(f)}
                                    className={`px-2 py-0.5 text-[11px] font-medium rounded uppercase transition ${format === f ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <pre className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all pr-12">
                            {activeSnippet}
                        </pre>
                        <button
                            onClick={handleCopy}
                            className="absolute right-2.5 top-2.5 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 transition"
                            title="Panoya Kopyala"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        onClick={handleCopy}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-zinc-900 dark:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition"
                    >
                        {copied ? <Check className="w-4 h-4 text-zinc-900 dark:text-white" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? "Kopyalandı!" : "Rozet Kodunu Kopyala"}</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
