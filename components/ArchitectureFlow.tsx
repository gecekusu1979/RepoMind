"use client";

import { ArchitectureBucket } from "@/types/repo";
import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, Expand } from "lucide-react";

interface ArchitectureFlowProps {
    buckets: ArchitectureBucket[];
    onLayerSelect?: (layer: string | null) => void;
    selectedLayer?: string | null;
}

export function ArchitectureFlow({ buckets, onLayerSelect, selectedLayer }: ArchitectureFlowProps) {
    const id = useId().replace(/:/g, ""); // Safe id for mermaid
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<HTMLDivElement>(null);

    const [scale, setScale] = useState(1);

    useEffect(() => {
        const renderGraph = async () => {
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: "dark",
                    fontFamily: "inherit",
                    securityLevel: "loose", // Must be loose to allow click handlers
                    flowchart: { curve: "basis" }
                });

                const activeBuckets = buckets.filter(b => b.paths.length > 0 && b.name !== "Other");
                if (activeBuckets.length === 0) return;

                let code = "graph TD\n";
                activeBuckets.forEach(b => {
                    const safeName = b.name.replace(/[^a-zA-Z]/g, '');
                    code += `  ${safeName}["${b.icon} ${b.name}<br/>(${b.paths.length} dosya)"]\n`;
                    if (b.name === "Frontend" && activeBuckets.some(x => x.name === "Backend")) {
                        code += `  ${safeName} --> Backend\n`;
                    }
                    if (b.name === "Backend" && activeBuckets.some(x => x.name === "Database")) {
                        code += `  ${safeName} --> Database\n`;
                    }
                    if (b.name === "Infra/DevOps") {
                        if (activeBuckets.some(x => x.name === "Backend")) code += `  ${safeName} -.-> Backend\n`;
                        if (activeBuckets.some(x => x.name === "Frontend")) code += `  ${safeName} -.-> Frontend\n`;
                    }
                });

                const uniqueId = `mermaid-svg-${id}-${Date.now()}`;
                const { svg: drawnSvg } = await mermaid.render(uniqueId, code);

                setSvg(drawnSvg);
            } catch (e) {
                console.error("Mermaid render error", e);
                setError(true);
            }
        };

        renderGraph();
    }, [buckets, id]);

    useEffect(() => {
        if (!svg || !svgRef.current || !onLayerSelect) return;

        const container = svgRef.current;
        const nodes = container.querySelectorAll<SVGGElement>("g.node");

        const handlers: { el: SVGGElement; handler: EventListener }[] = [];

        nodes.forEach((node) => {
            const textEl = node.querySelector("text, span, foreignObject");
            const rawText = textEl?.textContent ?? "";

            const matched = buckets.find((b) => {
                const safeName = b.name.replace(/[^a-zA-Z]/g, "");
                return node.id?.includes(safeName) || rawText.includes(b.name) || rawText.includes(b.icon);
            });

            if (!matched) return;

            const bucketName = matched.name;

            const isActive = selectedLayer === bucketName;
            node.style.cursor = "pointer";
            node.style.outline = isActive ? "2px solid #6366f1" : "";
            node.style.borderRadius = "6px";

            const handler: EventListener = () => {
                onLayerSelect(selectedLayer === bucketName ? null : bucketName);
            };

            node.addEventListener("click", handler);
            handlers.push({ el: node, handler });
        });

        return () => {
            handlers.forEach(({ el, handler }) => el.removeEventListener("click", handler));
        };
    }, [svg, buckets, onLayerSelect, selectedLayer]);

    if (error) return null;

    if (!svg) {
        return <div className="animate-pulse h-48 bg-zinc-900/5 dark:bg-white/5 rounded-2xl w-full border border-zinc-900/10 dark:border-white/10" />;
    }

    return (
        <div className="rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-900/10 dark:border-white/10 overflow-hidden relative">
            {/* Controls */}
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 rounded-lg p-1 z-10">
                <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1 hover:bg-zinc-900/10 dark:bg-white/10 rounded text-zinc-900/50 dark:text-white/50 hover:text-zinc-900/80 dark:text-white/80 transition-colors">
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => setScale(1)} className="p-1 hover:bg-zinc-900/10 dark:bg-white/10 rounded text-zinc-900/50 dark:text-white/50 hover:text-zinc-900/80 dark:text-white/80 transition-colors">
                    <Expand className="w-4 h-4" />
                </button>
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-zinc-900/10 dark:bg-white/10 rounded text-zinc-900/50 dark:text-white/50 hover:text-zinc-900/80 dark:text-white/80 transition-colors">
                    <ZoomOut className="w-4 h-4" />
                </button>
            </div>

            {/* Active filter hint */}
            {selectedLayer && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/40 rounded-full text-xs text-indigo-300 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    {selectedLayer} seçili
                </div>
            )}

            <div
                ref={containerRef}
                className="p-4 w-full h-[340px] overflow-auto flex items-center justify-center"
                style={{ cursor: "grab" }}
            >
                <div
                    ref={svgRef}
                    dangerouslySetInnerHTML={{ __html: svg }}
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: "center",
                        transition: "transform 0.2s ease-out"
                    }}
                />
            </div>
        </div>
    );
}
