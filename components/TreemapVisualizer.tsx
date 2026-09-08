"use client";

import React, { useState, useMemo } from "react";
import {
    Treemap,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { FileTreeItem, TreemapNode } from "@/types/repo";
import { buildTreemap, flattenForRecharts, formatBytes, CATEGORY_COLORS, getFileCategory } from "@/lib/treemap";

interface TreemapVisualizerProps {
    files: FileTreeItem[];
}

type Depth = 1 | 2 | 3 | 4;

// ─── Custom Content Renderer ───────────────────────────────────────────────

interface ContentProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    value?: number;
    depth?: number;
    root?: TreemapNode;
    category?: string;
}

function CustomContent(props: ContentProps) {
    const { x = 0, y = 0, width = 0, height = 0, name = "", value = 0, category } = props;

    const cat = (category as keyof typeof CATEGORY_COLORS) ?? "other";
    const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS["other"];

    if (width < 4 || height < 4) return null;

    const showLabel = width > 40 && height > 20;
    const showSize = width > 70 && height > 32;

    return (
        <g>
            <rect
                x={x + 1}
                y={y + 1}
                width={width - 2}
                height={height - 2}
                rx={3}
                fill={color}
                fillOpacity={0.75}
                stroke={color}
                strokeOpacity={0.3}
                strokeWidth={1}
                style={{ transition: "fill-opacity 0.15s" }}
            />
            {showLabel && (
                <text
                    x={x + 6}
                    y={y + 15}
                    fill="#fff"
                    fontSize={Math.min(12, Math.max(8, width / 10))}
                    fontFamily="monospace"
                    fontWeight={600}
                    opacity={0.9}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                >
                    {name.length > Math.floor(width / 7) ? name.slice(0, Math.floor(width / 7)) + "…" : name}
                </text>
            )}
            {showSize && (
                <text
                    x={x + 6}
                    y={y + 29}
                    fill="#fff"
                    fontSize={10}
                    fontFamily="monospace"
                    opacity={0.55}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                >
                    {formatBytes(value)}
                </text>
            )}
        </g>
    );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────

interface TooltipPayload {
    payload?: {
        path?: string;
        value?: number;
        name?: string;
        category?: string;
        root?: { value?: number };
    };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    const percentage =
        data.root?.value && data.value
            ? ((data.value / data.root.value) * 100).toFixed(1)
            : null;

    const cat = data.category ?? "other";
    const color = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] ?? CATEGORY_COLORS["other"];

    return (
        <div className="bg-[#0f0f1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-2xl max-w-xs">
            <p className="font-mono text-white/80 font-semibold truncate">{data.path ?? data.name}</p>
            <div className="flex items-center gap-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-white/50">{cat}</span>
            </div>
            <p className="text-white/60 mt-1">
                Boyut: <span className="text-white font-semibold">{formatBytes(data.value ?? 0)}</span>
                {percentage && <span className="text-white/40 ml-2">({percentage}%)</span>}
            </p>
        </div>
    );
}

// ─── Legend ──────────────────────────────────────────────────────────────

const LEGEND_ITEMS: { cat: keyof typeof CATEGORY_COLORS; label: string }[] = [
    { cat: "code", label: "Kod" },
    { cat: "styling", label: "Stil / Markup" },
    { cat: "assets", label: "Varlıklar" },
    { cat: "config", label: "Config" },
    { cat: "other", label: "Diğer" },
];

// ─── Main Component ──────────────────────────────────────────────────────

export const TreemapVisualizer = React.memo(function TreemapVisualizer({ files }: TreemapVisualizerProps) {
    const [depth, setDepth] = useState<Depth>(2);

    const root = useMemo(() => buildTreemap(files.filter((f) => f.type === "blob" && (f.size ?? 0) > 0)), [files]);

    // recharts Treemap requires an index-signature compatible type
    type RechartsTreemapItem = TreemapNode & Record<string, unknown>;
    const flatData: RechartsTreemapItem[] = useMemo(
        () =>
            (flattenForRecharts(root, depth) as RechartsTreemapItem[]).map((node) => ({
                ...node,
                category: node.category ?? (node.children ? "other" : getFileCategory(node.path)),
                root,
            })),
        [root, depth]
    );

    const totalBytes = root.value;

    if (flatData.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-white/30 text-sm">
                Boyut verisi mevcut değil (GitHub API ağaç verisi boyut içermiyor olabilir).
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                        Dosya Boyutu Isı Haritası
                    </h3>
                    <p className="text-xs text-white/25">
                        Toplam: <span className="text-white/50 font-medium">{formatBytes(totalBytes)}</span>
                    </p>
                </div>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                    {([1, 2, 3, 4] as Depth[]).map((d) => (
                        <button
                            key={d}
                            onClick={() => setDepth(d)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${depth === d
                                ? "bg-indigo-500/40 text-indigo-300 border border-indigo-500/40"
                                : "text-white/30 hover:text-white/60"
                                }`}
                        >
                            {d === 4 ? "Tam" : `D${d}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Treemap */}
            <div className="w-full rounded-xl overflow-hidden border border-white/5" style={{ height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        // @ts-expect-error recharts TreemapDataType requires recursive index sig
                        data={flatData}
                        dataKey="value"
                        nameKey="name"
                        content={<CustomContent />}
                        animationDuration={300}
                    >
                        <Tooltip content={<CustomTooltip />} />
                    </Treemap>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
                {LEGEND_ITEMS.map(({ cat, label }) => (
                    <div key={cat} className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                        />
                        <span className="text-xs text-white/40">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
);
