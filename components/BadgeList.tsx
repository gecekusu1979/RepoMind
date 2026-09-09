"use client";

interface BadgeListProps {
    goodPractices: string[];
    potentialProblems: string[];
}

export function BadgeList({ goodPractices, potentialProblems }: BadgeListProps) {
    return (
        <div className="space-y-4">
            {/* Problems */}
            {potentialProblems.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                        Potential Problems
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {potentialProblems.map((problem, i) => {
                            const isRed = problem.startsWith("🔴");
                            return (
                                <span
                                    key={i}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border backdrop-blur-sm ${isRed
                                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                                            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                        }`}
                                >
                                    {problem}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Good Practices */}
            {goodPractices.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                        Good Practices
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {goodPractices.map((practice, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 backdrop-blur-sm"
                            >
                                {practice}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {potentialProblems.length === 0 && goodPractices.length === 0 && (
                <div className="text-white/30 text-sm text-center py-4">
                    No specific patterns detected.
                </div>
            )}
        </div>
    );
}
