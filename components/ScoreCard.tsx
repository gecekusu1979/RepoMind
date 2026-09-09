"use client";

interface ScoreCardProps {
    label: string;
    score: number;
    icon: string;
    description: string;
    color: string;
}

function RadialScore({ score, color }: { score: number; color: string }) {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                {/* Track */}
                <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                />
                {/* Progress */}
                <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        transition: "stroke-dashoffset 1s ease-in-out",
                        filter: `drop-shadow(0 0 6px ${color}60)`,
                    }}
                />
            </svg>
            {/* Score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{score}</span>
                <span className="text-xs text-white/40 font-medium">/ 100</span>
            </div>
        </div>
    );
}

function getRating(score: number): { label: string; color: string } {
    if (score >= 80) return { label: "Excellent", color: "#22c55e" };
    if (score >= 60) return { label: "Good", color: "#84cc16" };
    if (score >= 40) return { label: "Fair", color: "#f59e0b" };
    if (score >= 20) return { label: "Poor", color: "#f97316" };
    return { label: "Critical", color: "#ef4444" };
}

export function ScoreCard({ label, score, icon, description, color }: ScoreCardProps) {
    const rating = getRating(score);

    return (
        <div
            className="relative flex items-center gap-4 p-4 rounded-2xl border bg-white/[0.03] overflow-hidden group hover:bg-white/[0.05] transition-colors"
            style={{ borderColor: color + "20" }}
        >
            {/* Glow BG */}
            <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity"
                style={{ backgroundColor: color }}
            />

            <RadialScore score={score} color={color} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{icon}</span>
                    <h4 className="font-semibold text-white text-sm">{label}</h4>
                </div>
                <p className="text-xs text-white/40 leading-relaxed mb-2">{description}</p>
                <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: rating.color + "20", color: rating.color }}
                >
                    {rating.label}
                </span>
            </div>
        </div>
    );
}

interface ScorePanelProps {
    testScore: number;
    docScore: number;
    healthScore: number;
    overall: number;
}

export function ScorePanel({ testScore, docScore, healthScore, overall }: ScorePanelProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                    Quality Metrics
                </h3>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/30">Overall</span>
                    <span
                        className="text-sm font-bold px-2 py-0.5 rounded-full"
                        style={{
                            backgroundColor: getRating(overall).color + "20",
                            color: getRating(overall).color,
                        }}
                    >
                        {overall}/100
                    </span>
                </div>
            </div>

            <div className="space-y-2.5">
                <ScoreCard
                    label="Test Coverage"
                    score={testScore}
                    icon="🧪"
                    description="Ratio of test files to executable source files"
                    color="#ec4899"
                />
                <ScoreCard
                    label="Documentation"
                    score={docScore}
                    icon="📚"
                    description="README quality, contributing guide, license & inline docs"
                    color="#8b5cf6"
                />
                <ScoreCard
                    label="Code Health"
                    score={healthScore}
                    icon="💊"
                    description="Nesting depth, linter config, .gitignore, lockfile"
                    color="#22c55e"
                />
            </div>
        </div>
    );
}
