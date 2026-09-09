"use client";

import { useState } from "react";
import { RepoMeta, ActivityResult } from "@/types/repo";
import { Star, GitFork, ExternalLink, Globe, AlertCircle, Calendar, Shield } from "lucide-react";
import BadgeModal from "@/components/BadgeModal";
import { RepoPulseBadge } from "@/components/RepoPulseBadge";

interface RepoHeaderProps {
    meta: RepoMeta;
    totalFiles: number;
    truncated: boolean;
    activity: ActivityResult;
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
}

const LANG_COLORS: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f7df1e",
    Python: "#3572A5",
    Go: "#00ADD8",
    Rust: "#dea584",
    Java: "#b07219",
    "C#": "#178600",
    "C++": "#f34b7d",
    C: "#555555",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#ffac45",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    Vue: "#41b883",
    Svelte: "#ff3e00",
    CSS: "#563d7c",
    HTML: "#e34c26",
    Shell: "#89e051",
};

export function RepoHeader({ meta, totalFiles, truncated, activity }: RepoHeaderProps) {
    const [isBadgeOpen, setIsBadgeOpen] = useState(false);
    const langColor = (meta.language && LANG_COLORS[meta.language]) || "#8b5cf6";
    const updatedAt = new Date(meta.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return (
        <div className="space-y-4">
            {/* Title row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                            <span className="text-white/40">{meta.owner}/</span>
                            <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text">{meta.name}</span>
                        </h1>
                        <a
                            href={meta.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/30 hover:text-white/70 transition-colors"
                            title="Open on GitHub"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                    {meta.description && (
                        <p className="text-white/50 text-sm md:text-base leading-relaxed max-w-2xl">
                            {meta.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Stat Pills */}
            <div className="flex items-center gap-2 flex-wrap">
                <Pill icon={<Star className="w-3.5 h-3.5 text-amber-400" />} label={formatCount(meta.stars)} title="Stars" />
                <Pill icon={<GitFork className="w-3.5 h-3.5 text-blue-400" />} label={formatCount(meta.forks)} title="Forks" />
                <Pill
                    icon={<span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: langColor }} />}
                    label={meta.language ?? "Unknown"}
                    title="Primary Language"
                />
                <Pill
                    icon={<span className="text-xs">📄</span>}
                    label={`${formatCount(totalFiles)} files${truncated ? "+" : ""}`}
                    title="Total files in repository"
                />
                {meta.license && (
                    <Pill icon={<span className="text-xs">⚖️</span>} label={meta.license} title="License" />
                )}
                <Pill
                    icon={<Calendar className="w-3.5 h-3.5 text-white/30" />}
                    label={`Updated ${updatedAt}`}
                    title="Last updated"
                />
                {/* Activity vitality badge */}
                <span
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold"
                    style={{
                        color: activity.color,
                        borderColor: activity.color + "44",
                        backgroundColor: activity.color + "11",
                    }}
                    title={`${activity.daysSinceUpdate} gün önce güncellendi`}
                >
                    {activity.emoji} {activity.status}
                </span>
                {meta.homepage && (
                    <a
                        href={meta.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 rounded-full text-xs text-white/50 hover:text-white/80 transition-all"
                    >
                        <Globe className="w-3.5 h-3.5" />
                        Website
                    </a>
                )}
            </div>

            {/* Commit pulse badge (lazy-loaded via IntersectionObserver) */}
            <RepoPulseBadge owner={meta.owner} repo={meta.name} />

            {/* Truncation warning */}
            {truncated && (
                <div className="flex items-center gap-2 text-amber-400/80 text-xs bg-amber-400/5 border border-amber-400/20 rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                        Repository has more than 100,000 items. File tree was truncated — analysis is based on the first 100k entries.
                    </span>
                </div>
            )}

            {/* Topics */}
            {meta.topics.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                    {meta.topics.slice(0, 12).map((topic) => (
                        <span
                            key={topic}
                            className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full font-medium"
                        >
                            {topic}
                        </span>
                    ))}
                </div>
            )}

            <div className="pt-2">
                <button
                    onClick={() => setIsBadgeOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-sm font-semibold transition"
                >
                    <Shield className="w-4 h-4" />
                    <span>Rozeti Al</span>
                </button>
            </div>

            <BadgeModal
                isOpen={isBadgeOpen}
                onClose={() => setIsBadgeOpen(false)}
                owner={meta.owner}
                repo={meta.name}
            />
        </div>
    );
}

function Pill({
    icon,
    label,
    title,
}: {
    icon: React.ReactNode;
    label: string;
    title?: string;
}) {
    return (
        <div
            title={title}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/60 font-medium"
        >
            {icon}
            <span>{label}</span>
        </div>
    );
}
