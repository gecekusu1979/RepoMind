"use client";

import { useState } from "react";
import { AnalyzeResponse } from "@/types/repo";
import { FileDown, Printer, X, FileText, ChevronDown } from "lucide-react";
import { downloadMarkdownReport, openPrintReport } from "@/lib/reportGenerator";

interface ExportReportModalProps {
    data: AnalyzeResponse;
}

export function ExportReportModal({ data }: ExportReportModalProps) {
    const [open, setOpen] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    const handleMdDownload = () => {
        downloadMarkdownReport(data);
        setOpen(false);
    };

    const handlePdfExport = async () => {
        setPdfLoading(true);
        try {
            openPrintReport(data);
        } finally {
            setPdfLoading(false);
            setOpen(false);
        }
    };

    return (
        <div className="relative">
            {/* Trigger button */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-200 text-xs rounded-xl transition-all font-semibold"
            >
                <FileText className="w-3.5 h-3.5" />
                Raporu İndir
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown panel */}
            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                        aria-hidden
                    />
                    {/* Panel */}
                    <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-[#0d0d1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/10">
                            <div>
                                <p className="text-xs font-semibold text-white/80">Audit Raporu</p>
                                <p className="text-[10px] text-white/30 mt-0.5">{data.meta.fullName}</p>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-3 space-y-2">
                            {/* Summary row */}
                            <div className="grid grid-cols-3 gap-2 pb-2 border-b border-white/5">
                                <ScorePill label="Genel" score={data.analysis.metrics.overall} />
                                <ScorePill label="Test" score={data.analysis.metrics.testScore} />
                                <ScorePill label="Sağlık" score={data.analysis.metrics.healthScore} />
                            </div>

                            {/* Markdown download */}
                            <button
                                onClick={handleMdDownload}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-xl transition-all text-left group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <FileDown className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
                                        Markdown İndir
                                    </p>
                                    <p className="text-[10px] text-white/30">
                                        repomind-audit-{data.meta.name}.md
                                    </p>
                                </div>
                            </button>

                            {/* PDF export */}
                            <button
                                onClick={handlePdfExport}
                                disabled={pdfLoading}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-xl transition-all text-left group disabled:opacity-50"
                            >
                                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                                    <Printer className="w-4 h-4 text-violet-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
                                        PDF Olarak Yazdır
                                    </p>
                                    <p className="text-[10px] text-white/30">
                                        Tarayıcı baskı motoru · Vektör kalite
                                    </p>
                                </div>
                            </button>
                        </div>

                        {/* Footer note */}
                        <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/5">
                            <p className="text-[10px] text-white/20">
                                Sunucu yok · API anahtarı yok · Sıfır maliyet
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function ScorePill({ label, score }: { label: string; score: number }) {
    const color =
        score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
    return (
        <div className="flex flex-col items-center gap-0.5 py-1.5 px-2 bg-white/[0.03] rounded-xl">
            <span className={`text-sm font-bold ${color}`}>{score}</span>
            <span className="text-[9px] text-white/30">{label}</span>
        </div>
    );
}
