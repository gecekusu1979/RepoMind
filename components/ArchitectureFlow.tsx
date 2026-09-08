"use client";

import { ArchitectureBucket } from "@/types/repo";
import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, Expand } from "lucide-react";

interface ArchitectureFlowProps {
    buckets: ArchitectureBucket[];
}

export function ArchitectureFlow({ buckets }: ArchitectureFlowProps) {
    const id = useId().replace(/:/g, ""); // Safe id for mermaid
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Scale for pan/zoom
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const renderGraph = async () => {
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: "dark",
                    fontFamily: "inherit",
                    securityLevel: "strict",
                    flowchart: { curve: "basis" }
                });

                const activeBuckets = buckets.filter(b => b.paths.length > 0 && b.name !== "Other");
                if (activeBuckets.length === 0) return;

                let code = "graph TD\n";
                // Node definition
                activeBuckets.forEach(b => {
                    const safeName = b.name.replace(/[^a-zA-Z]/g, '');
                    code += `  ${safeName}["${b.icon} ${b.name}<br/>(${b.paths.length} dosya)"]\n`;
                    // Basic edges based on architecture
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

                // Inject SVG directly
                setSvg(drawnSvg);
            } catch (e) {
                console.error("Mermaid render error", e);
                setError(true);
            }
        };

        renderGraph();
    }, [buckets, id]);

    if (error) return null;

    if (!svg) {
        return <div className="animate-pulse h-48 bg-white/5 rounded-2xl w-full border border-white/10" />;
    }

    return (
        <div className="rounded-2xl border bg-zinc-950 border-white/10 overflow-hidden relative">
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1 z-10">
                <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white/80 transition-colors">
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => setScale(1)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white/80 transition-colors">
                    <Expand className="w-4 h-4" />
                </button>
                <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white/80 transition-colors">
                    <ZoomOut className="w-4 h-4" />
                </button>
            </div>

            <div
                ref={containerRef}
                className="p-4 w-full h-[340px] overflow-auto flex items-center justify-center"
                style={{ cursor: "grab" }}
            >
                <div
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
