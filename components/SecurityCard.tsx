"use client";

import { SecurityScanResult, RepoMeta, ArchitectureBucket } from "@/types/repo";
import { Shield, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { ContentScanResult } from "@/lib/contentScanner"; // Assuming these are exported for types, or we can inline type them

interface SecurityCardProps {
    security: SecurityScanResult;
    meta?: RepoMeta;
    architecture?: ArchitectureBucket[];
}

const RISK_CONFIG = {
    Clean: { icon: ShieldCheck, color: "#22c55e", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Temiz", text: "text-emerald-400" },
    Low: { icon: Shield, color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Düşük Risk", text: "text-amber-400" },
    Critical: { icon: ShieldAlert, color: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/20", label: "Kritik Risk", text: "text-red-400" },
};

export function SecurityCard({ security, meta, architecture }: SecurityCardProps) {
    const [open, setOpen] = useState(security.riskLevel !== "Clean");
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<ContentScanResult | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    const cfg = RISK_CONFIG[security.riskLevel];
    const Icon = cfg.icon;

    const handleDeepScan = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Butona tıklanınca kart aç/kapa yapmasın
        if (!meta || !architecture) return;

        setIsScanning(true);
        setScanError(null);
        setOpen(true); // Tarama başlayınca detay panelini aç

        try {
            // Mimari haritasındaki tüm dosya yollarını düzleştir
            const pathsToScan = Array.from(new Set(architecture.flatMap(b => b.paths)));

            const res = await fetch("/api/scan-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner: meta.owner,
                    repo: meta.name,
                    branch: meta.defaultBranch,
                    paths: pathsToScan
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Tarama başarısız oldu");
            }

            setScanResult(data);
        } catch (error: unknown) {
            if (error instanceof Error) {
                setScanError(error.message);
            } else {
                setScanError("Bilinmeyen bir hata oluştu");
            }
        } finally {
            setIsScanning(false);
        }
    };

    const hasInitialFindings = security.findings.length > 0;
    const totalFindings = (security.findings?.length || 0) + (scanResult?.findings?.length || 0);

    return (
        <div className={`rounded-2xl border ${cfg.bg} ${cfg.border} overflow-hidden`}>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-900/5 dark:bg-white/5 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0" style={{ color: cfg.color }} />
                    <div>
                        <div className={`font-semibold text-sm ${cfg.text}`}>
                            Güvenlik Taraması — {totalFindings > 0 && scanResult ? "Kritik Risk (İçerik)" : cfg.label}
                        </div>
                        <div className="text-xs text-zinc-900/40 dark:text-white/40 mt-0.5">
                            {!scanResult && totalFindings === 0
                                ? "Hiçbir riskli dosya tespit edilmedi"
                                : `${totalFindings} bulgu tespit edildi`}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {meta && architecture && !scanResult && (
                        <div
                            onClick={handleDeepScan}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/10 dark:bg-white/10 hover:bg-zinc-900/20 dark:hover:bg-white/20 text-zinc-900/60 dark:text-white/60 hover:text-zinc-900/90 dark:hover:text-white/90 rounded-xl transition-all font-medium text-xs border border-zinc-900/10 dark:border-white/10"
                        >
                            {isScanning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Search className="w-3.5 h-3.5" />
                            )}
                            Derin Tarama
                        </div>
                    )}
                    {(hasInitialFindings || scanResult) && (
                        open ? (
                            <ChevronUp className="w-4 h-4 text-zinc-900/30 dark:text-white/30" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-900/30 dark:text-white/30" />
                        )
                    )}
                </div>
            </button>

            {open && (
                <div className="px-4 pb-4 space-y-4">
                    <div className="h-px bg-zinc-900/5 dark:bg-white/5" />

                    {/* Temel bulgular (Dosya adından) */}
                    {security.findings.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-zinc-900/40 dark:text-white/40 uppercase tracking-widest pl-1">Dosya Yolu Bulguları</h4>
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
                                            <p className="font-mono text-xs font-semibold text-zinc-900/80 dark:text-white/80 truncate">
                                                {f.path}
                                            </p>
                                            <p className="text-xs text-zinc-900/50 dark:text-white/50 mt-0.5">{f.reason}</p>
                                            <p className="text-xs text-zinc-900/35 dark:text-white/35 mt-1 leading-relaxed">
                                                <span className="text-zinc-900/50 dark:text-white/50 font-medium">Öneri:</span> {f.recommendation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Derin Tarama Yükleniyor / Hata */}
                    {isScanning && (
                        <div className="flex flex-col items-center justify-center p-6 space-y-3 bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 rounded-xl">
                            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                            <div className="text-sm font-medium text-zinc-900/70 dark:text-white/70">
                                Gitleak-Radar içerik taraması yapılıyor...
                            </div>
                            <div className="text-xs text-zinc-900/40 dark:text-white/40 text-center max-w-xs">
                                Önemli hedefleri ({Math.min(30, architecture?.flatMap(b => b.paths).length || 0)} dosya) indirip içeriklerindeki sırları (API Key, JWT, vs.) tarıyoruz.
                            </div>
                        </div>
                    )}

                    {scanError && !isScanning && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500/90 text-sm flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                            {scanError}
                        </div>
                    )}

                    {/* Derin Tarama Bulguları (İçerikten) */}
                    {scanResult && !isScanning && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pl-1">
                                <h4 className="text-xs font-semibold text-zinc-900/40 dark:text-white/40 uppercase tracking-widest">
                                    İçerik Bulguları (gitleak-radar)
                                </h4>
                                <span className="text-[10px] text-zinc-900/30 dark:text-white/30 font-medium bg-zinc-900/5 dark:bg-white/5 px-2 py-0.5 rounded-lg">
                                    {scanResult.filesScanned} dosya, {scanResult.linesScanned} satır tarandı
                                </span>
                            </div>

                            {scanResult.findings.length === 0 ? (
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-center gap-2 text-emerald-600/80 dark:text-emerald-400/80 text-sm">
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>Taranan {scanResult.filesScanned} dosyada hiçbir sır bulunamadı.</span>
                                </div>
                            ) : (
                                scanResult.findings.map((f, i) => (
                                    <div
                                        key={`content-${i}`}
                                        className={`rounded-xl border p-4 space-y-2 ${f.severity === "critical"
                                            ? "bg-red-500/5 border-red-500/15"
                                            : f.severity === "high"
                                                ? "bg-orange-500/5 border-orange-500/15"
                                                : "bg-amber-500/5 border-amber-500/15"
                                            }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="text-sm flex-shrink-0 mt-0.5">
                                                {f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟠" : "🟡"}
                                            </span>
                                            <div className="min-w-0 w-full">
                                                <div className="flex items-start justify-between gap-4">
                                                    <p className="font-mono text-xs font-semibold text-zinc-900/80 dark:text-white/80 break-all">
                                                        {f.path}
                                                    </p>
                                                    <span className="text-[10px] font-mono text-zinc-900/40 dark:text-white/40 bg-zinc-900/5 dark:bg-white/5 px-1.5 rounded flex-shrink-0 mt-0.5">
                                                        L{f.line}
                                                    </span>
                                                </div>
                                                <h5 className="text-sm font-medium mt-1 mb-2 text-zinc-900/70 dark:text-white/70">
                                                    {f.ruleName}
                                                </h5>
                                                <div className="bg-zinc-900/10 dark:bg-[#000000] rounded pl-3 pr-2 py-2 border-l-2 border-l-zinc-900/30 dark:border-l-white/30 overflow-hidden relative">
                                                    <code className="text-xs font-mono text-zinc-900/60 dark:text-white/60 tracking-wider">
                                                        {f.maskedValue}
                                                    </code>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
