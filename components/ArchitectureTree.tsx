"use client";

import { useState } from "react";
import { ArchitectureBucket } from "@/types/repo";
import { ChevronRight, ChevronDown, Folder, File } from "lucide-react";

interface ArchitectureTreeProps {
    buckets: ArchitectureBucket[];
}

interface BucketCardProps {
    bucket: ArchitectureBucket;
}

function BucketCard({ bucket }: BucketCardProps) {
    const [open, setOpen] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const PREVIEW_COUNT = 8;
    const displayed = showAll ? bucket.paths : bucket.paths.slice(0, PREVIEW_COUNT);
    const remaining = bucket.count - PREVIEW_COUNT;

    return (
        <div
            className="rounded-xl border overflow-hidden transition-colors"
            style={{ borderColor: bucket.color + "30" }}
        >
            {/* Header */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                style={{ backgroundColor: bucket.color + "0A" }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{bucket.icon}</span>
                    <span className="font-semibold text-sm text-white/90">{bucket.name}</span>
                    <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: bucket.color + "20", color: bucket.color }}
                    >
                        {bucket.count}
                    </span>
                </div>
                {open ? (
                    <ChevronDown className="w-4 h-4 text-white/30" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-white/30" />
                )}
            </button>

            {/* File list */}
            {open && (
                <div className="px-3 pb-3 pt-1 space-y-0.5">
                    {displayed.map((path) => {
                        const parts = path.split("/");
                        const name = parts[parts.length - 1];
                        const dir = parts.slice(0, -1).join("/");
                        const isDir = !name.includes(".");
                        return (
                            <div
                                key={path}
                                className="flex items-center gap-1.5 py-0.5 hover:bg-white/5 rounded px-1 group"
                            >
                                {isDir ? (
                                    <Folder className="w-3.5 h-3.5 flex-shrink-0 text-white/25" />
                                ) : (
                                    <File className="w-3.5 h-3.5 flex-shrink-0 text-white/20" />
                                )}
                                <span className="text-xs font-mono text-white/40 group-hover:text-white/60 transition-colors truncate">
                                    {dir && <span className="text-white/25">{dir}/</span>}
                                    <span className="text-white/60">{name}</span>
                                </span>
                            </div>
                        );
                    })}
                    {remaining > 0 && !showAll && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowAll(true);
                            }}
                            className="text-xs text-white/30 hover:text-white/60 transition-colors px-1 py-0.5 font-medium"
                        >
                            +{remaining} more files…
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export function ArchitectureTree({ buckets }: ArchitectureTreeProps) {
    return (
        <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest px-1">
                Architecture Map
            </h3>
            {buckets.length === 0 ? (
                <div className="text-white/30 text-sm text-center py-8">
                    No architecture buckets detected.
                </div>
            ) : (
                <div className="space-y-2">
                    {buckets.map((b) => (
                        <BucketCard key={b.name} bucket={b} />
                    ))}
                </div>
            )}
        </div>
    );
}
