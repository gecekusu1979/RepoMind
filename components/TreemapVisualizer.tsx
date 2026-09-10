"use client";

import React, { useState, useMemo } from "react";
import {
    Treemap,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { FileTreeItem, ArchitectureBucket } from "@/types/repo";
import { TreemapNode, buildTreemap, flattenForRecharts, formatBytes, CATEGORY_COLORS, getFileCategory } from "@/lib/treemap";
import { X, Filter } from "lucide-react";

interface TreemapVisualizerProps {
    files: FileTreeItem[];
    selectedLayer?: string | null;
    onClearFilter?: () => void;
    buckets?: ArchitectureBucket[];
}

type Depth = 1 | 2 | 3 | 4;


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


const LEGEND_ITEMS: { cat: keyof typeof CATEGORY_COLORS; label: string }[] = [
    { cat: "code", label: "Kod" },
    { cat: "markup", label: "Markup & CSS" },
    { cat: "asset", label: "Varlıklar" },
    { cat: "config", label: "Config" },
    { cat: "aggregate", label: "Diğer (Küme)" },
];


export const TreemapVisualizer = React.memo(function TreemapVisualizer({
    files,
    selectedLayer,
    onClearFilter,
    buckets,
}: TreemapVisualizerProps) {
    const [depth, setDepth] = useState<Depth>(2);

    const filteredFiles = useMemo(() => {
        if (!selectedLayer || !buckets) return files;
        const activeBucket = buckets.find((b) => b.name === selectedLayer);
        if (!activeBucket) return files;

        const samplePaths = new Set(activeBucket.paths);
        const prefixes = activeBucket.paths.map((p) => {
            const parts = p.split("/");
            return parts.length > 1 ? parts[0] : p;
        });
        const prefixSet = new Set(prefixes);

        return files.filter((f) => {
            if (samplePaths.has(f.path)) return true;
            const topDir = f.path.split("/")[0];
            return prefixSet.has(topDir);
        });
    }, [files, selectedLayer, buckets]);

    const root = useMemo(() => buildTreemap(filteredFiles.filter((f) => f.type === "blob" && (f.size ?? 0) > 0)), [filteredFiles]);

    type RechartsTreemapItem = TreemapNode & Record<string, unknown>;
    const flatData: RechartsTreemapItem[] = useMemo(
        () =>
            (flattenForRecharts(root, depth) as RechartsTreemapItem[]).map((node) => ({
                ...node,
                category: node.category ?? (node.children ? "aggregate" : getFileCategory(node.name ?? "")),
                root,
            })),
        [root, depth]
    );

    const totalBytes = root.value ?? 0;

    const filteredCount = filteredFiles.filter((f) => f.type === "blob").length;

    if (flatData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/30 text-sm">
                <p>Boyut verisi mevcut değil (GitHub API ağaç verisi boyut içermiyor olabilir).</p>
                {selectedLayer && onClearFilter && (
                    <button
                        onClick={onClearFilter}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs rounded-xl hover:bg-indigo-500/30 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" /> Filtreyi Temizle
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="space-y-0.5">
                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                        Dosya Boyutu Isı Haritası
                    </h3>
                    <p className="text-xs text-white/25">
                        Toplam: <span className="text-white/50 font-medium">{formatBytes(totalBytes)}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Active filter chip */}
                    {selectedLayer && onClearFilter && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/15 border border-indigo-500/40 rounded-xl text-xs text-indigo-300 font-semibold animate-in fade-in duration-200">
                            <Filter className="w-3 h-3" />
                            Filtre: {selectedLayer} ({filteredCount} dosya)
                            <button
                                onClick={onClearFilter}
                                className="ml-1 hover:text-white transition-colors"
                                title="Filtreyi temizle"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    {/* Depth controls */}
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
            </div>

            {/* Treemap */}
            <div className="w-full rounded-xl overflow-hidden border border-white/5" style={{ height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data={flatData as any}
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
});
