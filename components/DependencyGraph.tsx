"use client";

import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, Expand, Box } from "lucide-react";

interface DependencyGraphProps {
    dependencies: string[];
    devDependencies: string[];
}

export function DependencyGraph({ dependencies, devDependencies }: DependencyGraphProps) {
    const id = useId().replace(/:/g, "");
    const [svg, setSvg] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const svgRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const renderGraph = async () => {
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: "dark",
                    fontFamily: "inherit",
                });

                if (dependencies.length === 0 && devDependencies.length === 0) return;

                // Build a mindmap or a flowchart tree
                let code = "graph LR\n";
                code += "  Root([📦 Proje])\n";

                if (dependencies.length > 0) {
                    code += "  Root --> Deps(Dependencies)\n";
                    // Only show first 15 to avoid massive graphs, rest grouped
                    const visibleDeps = dependencies.slice(0, 15);
                    visibleDeps.forEach((dep, i) => {
                        const safeDep = `dep_${i}`;
                        code += `  Deps --> ${safeDep}["${dep}"]\n`;
                        code += `  style ${safeDep} fill:#22c55e22,stroke:#22c55e,stroke-width:1px,color:#fff\n`;
                    });
                    if (dependencies.length > 15) {
                        code += `  Deps --> dep_more["... +${dependencies.length - 15} daha"]\n`;
                    }
                    code += `  style Deps fill:#22c55e44,stroke:#22c55e,stroke-width:2px,color:#fff\n`;
                }

                if (devDependencies.length > 0) {
                    code += "  Root --> DevDeps(DevDependencies)\n";
                    const visibleDevDeps = devDependencies.slice(0, 15);
                    visibleDevDeps.forEach((dep, i) => {
                        const safeDep = `devdep_${i}`;
                        code += `  DevDeps --> ${safeDep}["${dep}"]\n`;
                        code += `  style ${safeDep} fill:#f59e0b22,stroke:#f59e0b,stroke-width:1px,color:#fff\n`;
                    });
                    if (devDependencies.length > 15) {
                        code += `  DevDeps --> devdep_more["... +${devDependencies.length - 15} daha"]\n`;
                    }
                    code += `  style DevDeps fill:#f59e0b44,stroke:#f59e0b,stroke-width:2px,color:#fff\n`;
                }

                code += `  style Root fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#fff\n`;

                const uniqueId = `mermaid-dep-${id}-${Date.now()}`;
                const { svg: drawnSvg } = await mermaid.render(uniqueId, code);

                setSvg(drawnSvg);
            } catch (e) {
                console.error("Mermaid dep graph render error", e);
                setError(true);
            }
        };

        renderGraph();
    }, [dependencies, devDependencies, id]);

    if (error) return null;

    if (!svg && (dependencies.length > 0 || devDependencies.length > 0)) {
        return <div className="animate-pulse h-48 bg-zinc-900/5 dark:bg-white/5 rounded-2xl w-full border border-zinc-900/10 dark:border-white/10" />;
    }

    if (dependencies.length === 0 && devDependencies.length === 0) {
        return null; // Don't render anything if no dependencies
    }

    return (
        <div className="rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-900/10 dark:border-white/10 flex flex-col relative overflow-hidden">
            <div className="p-3 border-b border-zinc-900/10 dark:border-white/10 bg-zinc-900/[0.02] dark:bg-white/[0.02] flex items-center justify-between z-10">
                <h3 className="text-xs font-semibold text-zinc-900/50 dark:text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5" />
                    Bağımlılık Grafiği
                </h3>
                <div className="flex items-center gap-1 bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 rounded-lg p-1">
                    <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-1 hover:bg-zinc-900/10 dark:bg-white/10 rounded text-zinc-900/50 dark:text-white/50 hover:text-zinc-900/80 dark:text-white/80 transition-colors">
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setScale(1)} className="p-1 hover:bg-zinc-900/10 dark:bg-white/10 rounded text-zinc-900/50 dark:text-white/50 hover:text-zinc-900/80 dark:text-white/80 transition-colors">
                        <Expand className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-zinc-900/10 dark:bg-white/10 rounded text-zinc-900/50 dark:text-white/50 hover:text-zinc-900/80 dark:text-white/80 transition-colors">
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div
                className="p-4 w-full h-[300px] overflow-auto flex items-center justify-center bg-slate-50 dark:bg-[#0d0d12]"
                style={{ cursor: "grab" }}
            >
                <div
                    ref={svgRef}
                    dangerouslySetInnerHTML={{ __html: svg! }}
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
