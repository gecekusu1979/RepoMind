"use client";

import { SecurityScanResult } from "@/types/repo";
import { Shield, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface SecurityCardProps {
    security: SecurityScanResult;
}

const RISK_CONFIG = {
    Clean: { icon: ShieldCheck, color: "#22c55e", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Temiz", text: "text-emerald-400" },
    Low: { icon: Shield, color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Düşük Risk", text: "text-amber-400" },
    Critical: { icon: ShieldAlert, color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/20", label: "Kritik Risk", text: "text-red-400" },
};

export function SecurityCard({ security }: SecurityCardProps) {
    const [open, setOpen] = useState(security.riskLevel !== "Clean");
    const cfg = RISK_CONFIG[security.riskLevel];
    const Icon = cfg.icon;

    return (
        <div className={`rounded-2xl border ${cfg.bg} ${cfg.border} overflow-hidden`}>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0" style={{ color: cfg.color }} />
                    <div>
                        <div className={`font-semibold text-sm ${cfg.text}`}>
                            Güvenlik Taraması — {cfg.label}
                        </div>
                        <div className="text-xs text-white/30 mt-0.5">
                            {security.findings.length === 0
                                ? "Hiçbir riskli dosya tespit edilmedi"
                                : `${security.findings.length} bulgu tespit edildi`}
                        </div>
                    </div>
                </div>
                {security.findings.length > 0 &&
                    (open ? (
                        <ChevronUp className="w-4 h-4 text-white/30" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-white/30" />
                    ))}
            </button>

            {open && security.findings.length > 0 && (
                <div className="px-4 pb-4 space-y-3">
                    <div className="h-px bg-white/5" />
                    {security.findings.map((f, i) => (
                        <div
                            key={i}
                            className={`rounded-xl border p-3 space-y-1.5 ${f.severity === "critical"
                                    ? "bg-red-500/5 border-red-500/15"
                                    : "bg-amber-500/5 border-amber-500/15"
                                }`}
                        >
                            <div className="flex items-start gap-2">
                                <span className="text-sm flex-shrink-0">
                                    {f.severity === "critical" ? "🔴" : "🟡"}
                                </span>
                                <div className="min-w-0">
                                    <p className="font-mono text-xs font-semibold text-white/80 truncate">
                                        {f.path}
                                    </p>
                                    <p className="text-xs text-white/50 mt-0.5">{f.reason}</p>
                                    <p className="text-xs text-white/35 mt-1 leading-relaxed">
                                        <span className="text-white/50 font-medium">Öneri:</span> {f.recommendation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
