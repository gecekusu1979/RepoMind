/**
 * lib/reportGenerator.ts
 * Synthesizes a comprehensive "Due Diligence & Technical Health Audit" report.
 * Supports both Markdown export and structured data for PDF print views.
 */

import { AnalyzeResponse } from "@/types/repo";

function scoreEmoji(score: number): string {
    if (score >= 80) return "✅ Mükemmel";
    if (score >= 60) return "🟡 İyi";
    if (score >= 40) return "🟠 Orta";
    return "🔴 Zayıf";
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
}

export function buildAuditMarkdown(data: AnalyzeResponse): string {
    const { meta, analysis } = data;
    const {
        metrics,
        architecture,
        goodPractices,
        potentialProblems,
        topLanguages,
        totalFiles,
        security,
        activity,
        packageAudit,
        dependencies,
    } = analysis;

    const now = new Date().toLocaleString("tr-TR");
    const lines: string[] = [];

    lines.push(
        `# 🔍 Due Diligence & Teknik Sağlık Denetim Raporu`,
        `## ${meta.fullName}`,
        ``,
        `> **Oluşturulma:** ${now}  `,
        `> **Kaynak:** [${meta.url}](${meta.url})  `,
        `> **Lisans:** ${meta.license ?? "Belirtilmemiş"}`,
        ``,
        `---`,
        ``
    );

    lines.push(
        `## 📋 Yönetici Özeti`,
        ``,
        `| Metrik | Puan | Değerlendirme |`,
        `|--------|------|---------------|`,
        `| 🏆 Genel Skor | **${metrics.overall}/100** | ${scoreEmoji(metrics.overall)} |`,
        `| 🧪 Test Kapsamı ($S_{\\text{test}}$) | ${metrics.testScore}/100 | ${scoreEmoji(metrics.testScore)} |`,
        `| 📚 Dokümantasyon ($S_{\\text{doc}}$) | ${metrics.docScore}/100 | ${scoreEmoji(metrics.docScore)} |`,
        `| 💊 Kod Sağlığı ($S_{\\text{health}}$) | ${metrics.healthScore}/100 | ${scoreEmoji(metrics.healthScore)} |`,
        ``,
        `**Aktivite Durumu:** ${activity.emoji} ${activity.status} (${activity.daysSinceUpdate} gün önce güncellendi)  `,
        `**Güvenlik Riski:** ${security.riskLevel}`,
        ``,
        `---`,
        ``
    );

    lines.push(
        `## 📊 Depo Bilgileri`,
        ``,
        `| Alan | Değer |`,
        `|------|-------|`,
        `| ⭐ Yıldız | ${formatCount(meta.stars)} |`,
        `| 🍴 Fork | ${formatCount(meta.forks)} |`,
        `| 👁️ Watchers | ${formatCount(meta.watchers)} |`,
        `| 🌐 Birincil Dil | ${meta.language ?? "Bilinmiyor"} |`,
        `| 📂 Toplam Dosya | ${totalFiles} |`,
        `| 🐛 Açık Issue | ${meta.openIssues} |`,
        `| 📅 Oluşturulma | ${new Date(meta.createdAt).toLocaleDateString("tr-TR")} |`,
        `| 🔄 Son Güncelleme | ${new Date(meta.updatedAt).toLocaleDateString("tr-TR")} |`,
        ``
    );
    if (meta.description) {
        lines.push(`**Açıklama:** ${meta.description}`, ``);
    }
    if (meta.topics.length > 0) {
        lines.push(`**Konular:** ${meta.topics.join(", ")}`, ``);
    }
    lines.push(`---`, ``);

    lines.push(
        `## 🏗️ Mimari Dağılımı`,
        ``,
        `| Katman | Dosya Sayısı | Örnek Yollar |`,
        `|--------|-------------|--------------|`
    );
    architecture.forEach((b) => {
        const samples = b.paths.slice(0, 3).map((p) => `\`${p}\``).join(", ");
        lines.push(`| ${b.icon} **${b.name}** | ${b.paths.length} | ${samples || "—"} |`);
    });
    lines.push(``, `---`, ``);

    if (topLanguages.length > 0) {
        lines.push(`## 🌐 Dil Dağılımı`, ``);
        topLanguages.forEach((l) => {
            lines.push(`- **${l.lang}:** %${l.percentage} (${l.count} dosya)`);
        });
        lines.push(``, `---`, ``);
    }

    if (goodPractices.length > 0) {
        lines.push(`## ✅ İyi Uygulamalar`, ``);
        goodPractices.forEach((p) => lines.push(`- ${p}`));
        lines.push(``);
    }

    if (potentialProblems.length > 0) {
        lines.push(`## ⚠️ Potansiyel Sorunlar`, ``);
        potentialProblems.forEach((p) => lines.push(`- ${p}`));
        lines.push(``, `---`, ``);
    }

    lines.push(`## 🔒 Güvenlik Bulguları`, ``, `**Risk Seviyesi:** ${security.riskLevel}`, ``);
    if (security.findings.length === 0) {
        lines.push(`_Kritik güvenlik bulgusu tespit edilmedi._`, ``);
    } else {
        security.findings.forEach((f) => {
            lines.push(
                `### ${f.severity === "critical" ? "🔴" : "🟡"} \`${f.path}\``,
                `**Sebep:** ${f.reason}`,
                `**Öneri:** ${f.recommendation}`,
                ``
            );
        });
    }
    lines.push(`---`, ``);

    if (packageAudit.hasPackageJson) {
        lines.push(`## 📦 Paket Denetimi`, ``);
        if (packageAudit.findings.length === 0) {
            lines.push(`_Bilinen riskli paket tespit edilmedi._`, ``);
        } else {
            packageAudit.findings.forEach((f) => {
                lines.push(
                    `### ${f.severity === "high" ? "🔴" : "🟡"} \`${f.name}\``,
                    `**Sebep:** ${f.reason}`,
                    `**Öneri:** ${f.recommendation}`,
                    ``
                );
            });
        }
        lines.push(`---`, ``);
    }

    const devopsAudit = analysis.devopsAudit;
    if (devopsAudit?.scanned) {
        lines.push(`## 🚀 DevOps & CI/CD Denetimi`, ``);
        if (devopsAudit.findings.length === 0) {
            lines.push(`_DevOps konfigürasyon sorunu tespit edilmedi._`, ``);
        } else {
            devopsAudit.findings.forEach((f) => {
                lines.push(
                    `### ${f.severity === "critical" ? "🔴" : "🟡"} \`${f.file}\`${f.line ? ` (Satır ${f.line})` : ""}`,
                    `**Kural:** ${f.rule}`,
                    `**Mesaj:** ${f.message}`,
                    `**Düzeltme:** ${f.remediation}`,
                    ``
                );
            });
        }
        lines.push(`---`, ``);
    }

    if (dependencies.length > 0) {
        lines.push(`## 📦 Bağımlılıklar (${dependencies.length})`, ``);
        lines.push(dependencies.slice(0, 40).map((d) => `\`${d}\``).join(" · "));
        if (dependencies.length > 40) {
            lines.push(``, `_...ve ${dependencies.length - 40} bağımlılık daha_`);
        }
        lines.push(``, `---`, ``);
    }

    lines.push(
        `_Bu rapor [RepoMind](https://repomind.app) heuristik motoru tarafından ${now} tarihinde otomatik olarak oluşturulmuştur._`
    );

    return lines.join("\n");
}

export function downloadMarkdownReport(data: AnalyzeResponse): void {
    const md = buildAuditMarkdown(data);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repomind-audit-${data.meta.owner}-${data.meta.name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function openPrintReport(data: AnalyzeResponse): void {
    const md = buildAuditMarkdown(data);
    const escaped = md
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>RepoMind Audit — ${data.meta.fullName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 20mm 18mm; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #1a1a2e;
      background: #fff;
      padding: 0;
    }
    .cover {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      min-height: 80vh;
      padding: 40px 0;
      border-bottom: 3px solid #6366f1;
      margin-bottom: 32px;
    }
    .cover h1 { font-size: 26pt; color: #6366f1; margin-bottom: 8px; }
    .cover h2 { font-size: 16pt; color: #374151; font-weight: 500; margin-bottom: 24px; }
    .cover .meta { font-size: 10pt; color: #6b7280; line-height: 2; }
    pre {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      background: #f8f8ff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 16px;
      white-space: pre-wrap;
      word-break: break-word;
      page-break-inside: avoid;
    }
    .audit-card {
      border: 1px solid #e5e7eb;
      border-left: 4px solid #6366f1;
      border-radius: 6px;
      padding: 16px 20px;
      margin: 16px 0;
      page-break-inside: avoid;
      background: #fafafa;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
      pre { border: 1px solid #ccc; }
    }
    button.no-print {
      position: fixed; top: 16px; right: 16px;
      padding: 8px 18px; background: #6366f1; color: #fff;
      border: none; border-radius: 8px; font-size: 13px; cursor: pointer;
      box-shadow: 0 4px 16px rgba(99,102,241,0.3);
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">🖨️ PDF Olarak Yazdır</button>
  <div class="cover">
    <h1>Due Diligence &amp; Teknik Sağlık Denetim Raporu</h1>
    <h2>${data.meta.fullName}</h2>
    <div class="meta">
      <div><strong>Oluşturulma:</strong> ${data.meta.url}</div>
      <div><strong>Kaynak:</strong> ${data.meta.url}</div>
      <div><strong>Genel Puan:</strong> ${data.analysis.metrics.overall}/100</div>
      <div><strong>Güvenlik:</strong> ${data.analysis.security.riskLevel}</div>
    </div>
  </div>
  <pre>${escaped}</pre>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
    }
}
