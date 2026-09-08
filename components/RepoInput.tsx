"use client";

import { useState, KeyboardEvent } from "react";
import { Search, GitBranch, ArrowRight, Sparkles } from "lucide-react";

interface RepoInputProps {
    onAnalyze: (url: string) => void;
    isLoading: boolean;
}

const DEMO_REPOS = [
    { label: "facebook/react", url: "facebook/react" },
    { label: "shadcn/ui", url: "shadcn-ui/ui" },
    { label: "expressjs/express", url: "expressjs/express" },
    { label: "vercel/next.js", url: "vercel/next.js" },
];

export function RepoInput({ onAnalyze, isLoading }: RepoInputProps) {
    const [value, setValue] = useState("");

    const handleSubmit = () => {
        if (value.trim() && !isLoading) {
            onAnalyze(value.trim());
        }
    };

    const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSubmit();
    };

    return (
        <div className="w-full space-y-4">
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-blue-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm hover:border-white/20 transition-colors">
                    <GitBranch className="w-5 h-5 text-white/40 flex-shrink-0" />
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="https://github.com/owner/repo or owner/repo"
                        className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none text-sm md:text-base font-mono"
                        disabled={isLoading}
                        spellCheck={false}
                        autoComplete="off"
                        id="repo-input"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !value.trim()}
                        className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-400 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 flex-shrink-0 shadow-lg shadow-violet-500/25"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                <span className="hidden sm:inline">Analyzing…</span>
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4" />
                                <span className="hidden sm:inline">Analyze</span>
                                <ArrowRight className="w-4 h-4 sm:hidden" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Demo Pills */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-white/30 text-xs">
                    <Sparkles className="w-3 h-3" />
                    <span>Try:</span>
                </div>
                {DEMO_REPOS.map((demo) => (
                    <button
                        key={demo.url}
                        onClick={() => {
                            setValue(demo.url);
                            onAnalyze(demo.url);
                        }}
                        disabled={isLoading}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/50 hover:text-white/80 text-xs rounded-full font-mono transition-all duration-200 disabled:cursor-not-allowed"
                    >
                        {demo.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
