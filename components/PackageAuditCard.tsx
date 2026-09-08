"use client";

import { PackageAuditResult } from "@/types/repo";
import { Package, ShieldAlert, Code, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";

interface PackageAuditCardProps {
    audit: PackageAuditResult;
}

export function PackageAuditCard({ audit }: PackageAuditCardProps) {
    const [open, setOpen] = useState(audit.findings.length > 0);

    if (!audit.hasPackageJson) return null;

    const hasFindings = audit.findings.length > 0;

    // Group findings dynamically
    const depr = audit.findings.filter(f => !f.name.startsWith("script:") && f.name !== "license");
    const scripts = audit.findings.filter(f => f.name.startsWith("script:"));
    const license = audit.findings.filter(f => f.name === "license");

    return (
        <div className={`rounded-2xl border overflow-hidden ${hasFindings ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                disabled={!hasFindings}
            >
                <div className="flex items-center gap-3">
                    {hasFindings ? (
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                    ) : (
                        <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                    )}
                    <div>
                        <div className={`font-semibold text-sm ${hasFindings ? 'text-amber-400' : 'text-emerald-400'}`}>
                            Bağımlılık & Script Denetimi
                        </div>
                        <div className="text-xs text-white/30 mt-0.5">
                            {hasFindings
                                ? `${audit.findings.length} risk tespit edildi`
                                : "Tehlikeli paket, script veya viral lisans bulunmadı"}
                        </div>
                    </div>
                </div>
            </button>

            {open && hasFindings && (
                <div className="px-4 pb-4 space-y-4">
                    <div className="h-px bg-white/5" />

                    {depr.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase">
                                <Package className="w-3.5 h-3.5" /> Deprecated / Legacy Paketler
                            </div>
                            {depr.map((f, i) => (
                                <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-1.5">
                                    <p className="font-mono text-xs font-semibold text-white/90">{f.name}</p>
                                    <p className="text-xs text-white/50">{f.reason}</p>
                                    <p className="text-xs text-indigo-300 font-medium mt-1">Öneri: {f.recommendation}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {scripts.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase">
                                <Code className="w-3.5 h-3.5" /> Çalıştırılabilir Script Riskleri
                            </div>
                            {scripts.map((f, i) => (
                                <div key={i} className="bg-red-500/5 rounded-xl border border-red-500/15 p-3 space-y-1.5">
                                    <p className="font-mono text-xs font-semibold text-red-300">{f.name.replace("script:", "")}</p>
                                    <p className="text-xs text-white/50">{f.reason}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {license.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase">
                                <ShieldAlert className="w-3.5 h-3.5" /> Viral Lisans
                            </div>
                            {license.map((f, i) => (
                                <div key={i} className="bg-amber-500/10 rounded-xl border border-amber-500/20 p-3 space-y-1.5">
                                    <p className="text-xs text-white/50">{f.reason}</p>
                                    <p className="text-xs text-amber-300 font-medium">Öneri: {f.recommendation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
