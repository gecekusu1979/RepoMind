"use client";

import { useState, useCallback } from "react";
import { AnalyzeResponse } from "@/types/repo";
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface ExplainDrawerProps {
    data: AnalyzeResponse;
}

export function ExplainDrawer({ data }: ExplainDrawerProps) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchExplanation = useCallback(async () => {
        if (done || loading) return;
        setLoading(true);
        setError(null);
        setText("");

        try {
            const res = await fetch("/api/explain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Request failed" }));
                throw new Error(err.error ?? "Failed to fetch explanation.");
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No readable stream.");

            const decoder = new TextDecoder();
            while (true) {
                const { done: streamDone, value } = await reader.read();
                if (streamDone) break;
                setText((prev) => prev + decoder.decode(value, { stream: true }));
            }
            setDone(true);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Unknown error.");
        } finally {
            setLoading(false);
        }
    }, [data, done, loading]);

    const handleToggle = () => {
        const newOpen = !open;
        setOpen(newOpen);
        if (newOpen && !done && !loading) {
            fetchExplanation();
        }
    };

    return (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.03] overflow-hidden">
            {/* Toggle Button */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between gap-3 p-4 hover:bg-zinc-900/5 dark:bg-white/5 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Sparkles className="w-4 h-4 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                        <div className="font-semibold text-zinc-900 dark:text-white text-sm">
                            Explain this Repository
                        </div>
                        <div className="text-xs text-zinc-900/40 dark:text-white/40">
                            AI-powered breakdown by Gemini Flash
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
                    {open ? (
                        <ChevronUp className="w-4 h-4 text-zinc-900/30 dark:text-white/30" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-900/30 dark:text-white/30" />
                    )}
                </div>
            </button>

            {/* Content */}
            {open && (
                <div className="px-4 pb-5 pt-1">
                    <div className="h-px bg-zinc-900/5 dark:bg-white/5 mb-4" />

                    {error && (
                        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            ⚠️ {error}
                        </div>
                    )}

                    {!error && (text || loading) && (
                        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-900 dark:text-white prose-headings:font-semibold prose-p:text-zinc-900/70 dark:text-white/70 prose-p:leading-relaxed prose-li:text-zinc-900/70 dark:text-white/70 prose-strong:text-zinc-900 dark:text-white prose-code:text-violet-300 prose-code:bg-zinc-900/5 dark:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-zinc-900/5 dark:bg-white/5 prose-pre:border prose-pre:border-zinc-900/10 dark:border-white/10">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{text}</ReactMarkdown>
                            {loading && (
                                <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse rounded ml-0.5 align-middle" />
                            )}
                        </div>
                    )}

                    {loading && !text && (
                        <div className="flex items-center gap-3 text-zinc-900/40 dark:text-white/40 text-sm py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                            <span>Gemini is analyzing the repository…</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
