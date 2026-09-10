"use client";

import { useEffect, useState } from "react";
import { RecentRepo } from "@/types/repo";
import { getRecents, removeRecent, formatTTL, getCacheTTLRemaining } from "@/lib/cache";
import { Clock, X, Star } from "lucide-react";

interface RecentReposProps {
    onSelect: (fullName: string) => void;
    currentRepo?: string;
}

const LANG_COLORS: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f7df1e",
    Python: "#3572A5",
    Go: "#00ADD8",
    Rust: "#dea584",
    Java: "#b07219",
    "C#": "#178600",
    Ruby: "#701516",
    default: "#8b5cf6",
};

export function RecentRepos({ onSelect, currentRepo }: RecentReposProps) {
    const [recents, setRecents] = useState<RecentRepo[]>([]);
    const [ttls, setTtls] = useState<Record<string, number>>({});

    useEffect(() => {
        // localStorage sadece client'ta var; SSR ile hydration mismatch
        // yaşamamak için bilinçli olarak effect içinde okunuyor.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecents(getRecents());
    }, []);

    useEffect(() => {
        const update = () => {
            const newTtls: Record<string, number> = {};
            for (const r of recents) {
                const ttl = getCacheTTLRemaining(r.fullName);
                if (ttl !== null) newTtls[r.fullName] = ttl;
            }
            setTtls(newTtls);
        };
        update();
        const id = setInterval(update, 30_000);
        return () => clearInterval(id);
    }, [recents]);

    const handleRemove = (e: React.MouseEvent, fullName: string) => {
        e.stopPropagation();
        removeRecent(fullName);
        setRecents(getRecents());
    };

    if (recents.length === 0) return null;

    return (
        <div className="w-full">
            <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3 h-3 text-white/25" />
                <span className="text-xs text-white/25 font-medium">Son Aramalar</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {recents.map((repo) => {
                    const isActive = repo.fullName === currentRepo;
                    const langColor = LANG_COLORS[repo.language ?? ""] ?? LANG_COLORS.default;
                    const ttlRemaining = ttls[repo.fullName];

                    return (
                        <button
                            key={repo.fullName}
                            onClick={() => onSelect(repo.fullName)}
                            className={`group relative flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border text-xs transition-all ${isActive
                                    ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/50 hover:text-white/80"
                                }`}
                        >
                            {/* Language dot */}
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: langColor }}
                            />
                            <span className="font-mono font-medium">{repo.fullName}</span>

                            {/* Star count */}
                            {repo.stars > 0 && (
                                <span className="flex items-center gap-0.5 text-white/25 text-[10px]">
                                    <Star className="w-2.5 h-2.5" />
                                    {repo.stars >= 1000
                                        ? `${(repo.stars / 1000).toFixed(1)}k`
                                        : repo.stars}
                                </span>
                            )}

                            {/* Cache TTL badge */}
                            {ttlRemaining != null && (
                                <span className="text-[10px] text-white/20 font-medium">
                                    {formatTTL(ttlRemaining)}
                                </span>
                            )}

                            {/* Remove button */}
                            <span
                                role="button"
                                onClick={(e) => handleRemove(e, repo.fullName)}
                                className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-white/30 hover:text-white/60 transition-all cursor-pointer"
                                title="Kaldır"
                            >
                                <X className="w-3 h-3" />
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
