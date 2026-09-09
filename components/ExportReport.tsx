"use client";

import { AnalyzeResponse } from "@/types/repo";
import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";

interface ExportReportProps {
    data: AnalyzeResponse;
}

function buildMarkdown(data: AnalyzeResponse): string {
    const { meta, analysis } = data;
    const { metrics, architecture, goodPractices, potentialProblems, topLanguages,
        totalFiles, security, activity } = analysis;

    const formatCount = (n: number) =>
        n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString();

    const lines: string[] = [
        `# 🔍 RepoMind Analiz Raporu: ${meta.fullName}`,
        ``,
        `> **Oluşturulma:** ${new Date().toLocaleString("tr-TR")}  `,
        `> **Kaynak:** [${meta.url}](${meta.url})`,
        ``,
        `---`,
        ``,
        `## 📊 Depo Genel Bilgileri`,
        ``,
        `| Alan | Değer |`,
        `|------|-------|`,
        `| ⭐ Yıldız | ${formatCount(meta.stars)} |`,
        `| 🍴 Fork | ${formatCount(meta.forks)} |`,
        `| 🌐 Birincil Dil | ${meta.language ?? "Bilinmiyor"} |`,
        `| 📂 Toplam Dosya | ${totalFiles} |`,
        `| ⚖️ Lisans | ${meta.license ?? "Yok"} |`,
        `| 🐛 Açık Issue | ${meta.openIssues} |`,
        `| 🕐 Aktivite | ${activity.emoji} ${activity.status} (${activity.activityScore}/100) |`,
        `| 🔒 Güvenlik | ${security.riskLevel} |`,
        ``,
        meta.description ? `**Açıklama:** ${meta.description}\n` : "",
        `---`,
        ``,
        `## 🎯 Kalite Metrikleri`,
        ``,
        `| Metrik | Puan | Durum |`,
        `|--------|------|-------|`,
        `| 🧪 Test Kapsamı | ${metrics.testScore}/100 | ${getScoreEmoji(metrics.testScore)} |`,
        `| 📚 Dokümantasyon | ${metrics.docScore}/100 | ${getScoreEmoji(metrics.docScore)} |`,
        `| 💊 Kod Sağlığı | ${metrics.healthScore}/100 | ${getScoreEmoji(metrics.healthScore)} |`,
        `| 🏆 Genel | ${metrics.overall}/100 | ${getScoreEmoji(metrics.overall)} |`,
        ``,
        `---`,
        ``,
        `## 🏗️ Mimari Yapı`,
        ``,
        ...architecture.map(
            (b) => `- **${b.icon} ${b.name}:** ${b.paths.length} dosya — örnek: \`${b.paths[0] ?? "-"}\``
        ),
        ``,
        `---`,
        ``,
        `## 🌐 Dil Dağılımı`,
        ``,
        ...topLanguages.slice(0, 8).map(
            (l) => `- **${l.lang}:** ${l.percentage}% (${l.count} dosya)`
        ),
        ``,
        `---`,
        ``,
    ];

    if (goodPractices.length > 0) {
        lines.push(`## ✅ İyi Uygulamalar (${goodPractices.length})`, ``);
        goodPractices.forEach((p) => lines.push(`- ${p}`));
        lines.push(``);
    }

    if (potentialProblems.length > 0) {
        lines.push(`## ⚠️ Potansiyel Sorunlar (${potentialProblems.length})`, ``);
        potentialProblems.forEach((p) => lines.push(`- ${p}`));
        lines.push(``, `---`, ``);
    }

    if (security.findings.length > 0) {
        lines.push(`## 🔒 Güvenlik Bulguları`, ``);
        lines.push(`**Risk Seviyesi:** ${security.riskLevel}`, ``);
        security.findings.forEach((f) => {
            lines.push(
                `### ${f.severity === "critical" ? "🔴" : "🟡"} \`${f.path}\``,
                `**Sebep:** ${f.reason}`,
                `**Öneri:** ${f.recommendation}`,
                ``
            );
        });
        lines.push(`---`, ``);
    }

    if (analysis.dependencies.length > 0) {
        lines.push(`## 📦 Bağımlılıklar (${analysis.dependencies.length})`, ``);
        lines.push(analysis.dependencies.slice(0, 30).map((d) => `\`${d}\``).join(" · "));
        if (analysis.dependencies.length > 30) {
            lines.push(`\n_...ve ${analysis.dependencies.length - 30} bağımlılık daha_`);
        }
        lines.push(``);
    }

    lines.push(
        `---`,
        ``,
        `_Bu rapor [RepoMind](https://github.com) heuristik motoru tarafından oluşturulmuştur._`
    );

    return lines.filter((l) => l !== undefined).join("\n");
}

function getScoreEmoji(score: number): string {
    if (score >= 80) return "✅ Mükemmel";
    if (score >= 60) return "🟡 İyi";
    if (score >= 40) return "🟠 Orta";
    return "🔴 Zayıf";
}

export function ExportReport({ data }: ExportReportProps) {
    const [copied, setCopied] = useState(false);

    const getMarkdown = () => buildMarkdown(data);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(getMarkdown());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
        }
    };

    const handleDownload = () => {
        const md = getMarkdown();
        const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `AUDIT-${data.meta.owner}-${data.meta.name}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/50 hover:text-white/80 text-xs rounded-xl transition-all font-medium"
                title="Markdown olarak kopyala"
            >
                {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                    <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? "Kopyalandı!" : "Kopyala"}
            </button>
            <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/50 hover:text-white/80 text-xs rounded-xl transition-all font-medium"
                title="Markdown dosyası indir"
            >
                <Download className="w-3.5 h-3.5" />
                .md İndir
            </button>
        </div>
    );
}
