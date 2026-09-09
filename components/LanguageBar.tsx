"use client";

interface LanguageBarProps {
    languages: { lang: string; count: number; percentage: number }[];
}

const LANG_DISPLAY_COLORS: Record<string, string> = {
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
    SCSS: "#c6538c",
    JSON: "#6b6b6b",
    YAML: "#cb171e",
    Markdown: "#083fa1",
    Terraform: "#7b42bc",
    Docker: "#2496ED",
};

function getColor(lang: string): string {
    return LANG_DISPLAY_COLORS[lang] ?? "#64748b";
}

export function LanguageBar({ languages }: LanguageBarProps) {
    if (languages.length === 0) return null;

    return (
        <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                Language Distribution
            </h3>

            {/* Stacked bar */}
            <div className="h-2.5 rounded-full overflow-hidden flex gap-0.5">
                {languages.map((l) => (
                    <div
                        key={l.lang}
                        style={{
                            width: `${l.percentage}%`,
                            backgroundColor: getColor(l.lang),
                        }}
                        className="h-full rounded-full transition-all duration-700"
                        title={`${l.lang}: ${l.percentage}%`}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3">
                {languages.map((l) => (
                    <div key={l.lang} className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getColor(l.lang) }}
                        />
                        <span className="text-xs text-white/50 font-medium">{l.lang}</span>
                        <span className="text-xs text-white/25">{l.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
