"use client";

import { useState } from "react";
import { DevOpsAuditResult, DevOpsFinding } from "@/types/repo";
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, Terminal, AlertTriangle } from "lucide-react";

interface DevOpsHealthCardProps {
    audit: DevOpsAuditResult;
}

const RULE_LABELS: Record<string, string> = {
    D1_LATEST_TAG: "Docker: Latest Tag",
    D2_NO_USER_DIRECTIVE: "Docker: Root Kullanıcı",
    D3_CHAINED_RUN: "Docker: Zincirleme RUN",
    D4_DANGEROUS_FETCH: "Docker: Tehlikeli Fetch",
    A1_UNPINNED_ACTION: "Actions: Sabitlenmemiş Action",
    A2_PWNED_REQUEST: "Actions: Pwn-Request",
    A3_MISSING_PERMISSIONS: "Actions: İzin Bloğu Eksik",
};

function FindingRow({ finding }: { finding: DevOpsFinding }) {
    const [expanded, setExpanded] = useState(false);
    const isCritical = finding.severity === "critical";

    return (
        <div
            className={`rounded-xl border transition-all overflow-hidden ${isCritical
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-amber-500/20 bg-amber-500/5"
                }`}
        >
            <button
                onClick={() => setExpanded((e) => !e)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-900/[0.02] dark:bg-white/[0.02] transition-colors"
            >
                {/* Severity icon */}
                <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isCritical ? "bg-red-500/20" : "bg-amber-500/20"
                        }`}
                >
                    {isCritical ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                </div>

                {/* File + rule */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isCritical
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-amber-500/20 text-amber-400"
                                }`}
                        >
                            {finding.severity}
                        </span>
                        <span className="text-xs text-zinc-900/30 dark:text-white/30 font-mono">
                            {RULE_LABELS[finding.rule] ?? finding.rule}
                        </span>
                    </div>
                    <p className="text-xs text-zinc-900/60 dark:text-white/60 mt-0.5 font-mono truncate">
                        {finding.file}
                        {finding.line && (
                            <span className="text-zinc-900/30 dark:text-white/30"> :{finding.line}</span>
                        )}
                    </p>
                </div>

                {/* Expand toggle */}
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-900/30 dark:text-white/30 flex-shrink-0" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-900/30 dark:text-white/30 flex-shrink-0" />
                )}
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-zinc-900/5 dark:border-white/5 pt-3">
                    <p className="text-xs text-zinc-900/70 dark:text-white/70 leading-relaxed">{finding.message}</p>
                    <div className="bg-black/20 rounded-lg p-3 space-y-1">
                        <p className="text-[10px] font-semibold text-zinc-900/30 dark:text-white/30 uppercase tracking-wider flex items-center gap-1">
                            <Terminal className="w-3 h-3" /> Düzeltme
                        </p>
                        <p className="text-xs text-emerald-400/80 leading-relaxed whitespace-pre-wrap font-mono">
                            {finding.remediation}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export function DevOpsHealthCard({ audit }: DevOpsHealthCardProps) {
    const [showAll, setShowAll] = useState(false);

    if (!audit.scanned) {
        return null; // No DevOps files found — don't render the card
    }

    const criticalCount = audit.findings.filter((f) => f.severity === "critical").length;
    const warningCount = audit.findings.filter((f) => f.severity === "warning").length;
    const visible = showAll ? audit.findings : audit.findings.slice(0, 4);

    return (
        <div className="p-5 bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/10 dark:border-white/10 rounded-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h3 className="text-xs font-semibold text-zinc-900/30 dark:text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        DevOps & CI/CD Denetimi
                    </h3>
                    <p className="text-xs text-zinc-900/25 dark:text-white/25">
                        Docker + GitHub Actions konfigürasyon analizi
                    </p>
                </div>

                {/* Summary badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {audit.findings.length === 0 ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Temiz
                        </span>
                    ) : (
                        <>
                            {criticalCount > 0 && (
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-bold text-red-400">
                                    🔴 {criticalCount} Kritik
                                </span>
                            )}
                            {warningCount > 0 && (
                                <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-400">
                                    🟡 {warningCount} Uyarı
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Findings */}
            {audit.findings.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400/70 text-xs p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    Docker ve GitHub Actions dosyalarında sorun tespit edilmedi.
                </div>
            ) : (
                <div className="space-y-2">
                    {visible.map((f, i) => (
                        <FindingRow key={`${f.file}-${f.rule}-${i}`} finding={f} />
                    ))}
                    {audit.findings.length > 4 && (
                        <button
                            onClick={() => setShowAll((s) => !s)}
                            className="w-full text-xs text-zinc-900/30 dark:text-white/30 hover:text-zinc-900/60 dark:text-white/60 py-2 transition-colors flex items-center justify-center gap-1"
                        >
                            {showAll ? (
                                <>
                                    <ChevronUp className="w-3.5 h-3.5" /> Daha az göster
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-3.5 h-3.5" /> +{audit.findings.length - 4} daha
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
