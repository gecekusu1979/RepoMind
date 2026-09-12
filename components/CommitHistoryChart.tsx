"use client";

import { useMemo } from "react";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";
import { GitCommit, TrendingUp } from "lucide-react";

interface CommitActivityProps {
    data?: { date: string; count: number }[];
}

export function CommitHistoryChart({ data }: CommitActivityProps) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        // Optional: Fill in missing dates to make the graph continuous
        // For simplicity now, we just pass the sparse data which recharts interpolates ok
        return data.map(d => ({
            date: new Date(d.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
            count: d.count
        }));
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="p-5 bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/10 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center min-h-[200px] text-zinc-900/30 dark:text-white/30 text-sm">
                <GitCommit className="w-8 h-8 mb-2 opacity-50" />
                Commit geçmişi bulunamadı
            </div>
        );
    }

    const totalCommits = data.reduce((acc, curr) => acc + curr.count, 0);

    return (
        <div className="p-5 bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/10 dark:border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h3 className="text-xs font-semibold text-zinc-900/40 dark:text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                        Aktivite Trendi
                    </h3>
                    <p className="text-[10px] text-zinc-900/30 dark:text-white/30">Son 30 günlük commit aktivitesi</p>
                </div>
                <div className="text-right">
                    <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                        {totalCommits}
                    </span>
                    <span className="text-xs text-zinc-900/30 dark:text-white/30 ml-1">commit</span>
                </div>
            </div>

            <div className="h-[120px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                fontSize: '12px'
                            }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#818cf8"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorCount)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
