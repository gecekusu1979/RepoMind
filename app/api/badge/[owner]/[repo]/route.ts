import { NextRequest } from "next/server";
import { fetchRepoMeta, fetchFileTree, fetchCriticalFiles } from "@/lib/github";
import { analyzeRepo } from "@/lib/analyzer";

export const runtime = "edge";

function scoreColor(score: number): string {
    if (score >= 80) return "#10b981"; // emerald
    if (score >= 50) return "#f59e0b"; // amber
    return "#f43f5e";                  // rose
}

function scoreLabel(score: number): string {
    if (score >= 80) return "İyi";
    if (score >= 50) return "Orta";
    return "Zayıf";
}

function buildSvg(label: string, value: string, color: string): string {
    const labelWidth = label.length * 6.5 + 16;
    const valueWidth = value.length * 7 + 16;
    const totalWidth = labelWidth + valueWidth;

    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ owner: string; repo: string }> }
) {
    const { owner, repo } = await params;

    const url = new URL(req.url);
    const metric = url.searchParams.get("metric") ?? "health";

    try {
        const meta = await fetchRepoMeta(owner, repo);
        const { items, truncated } = await fetchFileTree(owner, repo, meta.defaultBranch);
        const { readme, packageJson } = await fetchCriticalFiles(owner, repo, meta.defaultBranch, items);
        const analysis = analyzeRepo(items, readme, packageJson, truncated);

        const METRIC_MAP: Record<string, { label: string; score: number }> = {
            health: { label: "RepoMind Sağlık", score: analysis.metrics.healthScore },
            test: { label: "RepoMind Test", score: analysis.metrics.testScore },
            doc: { label: "RepoMind Doküman", score: analysis.metrics.docScore },
            overall: { label: "RepoMind Genel", score: analysis.metrics.overall },
        };

        const info = METRIC_MAP[metric] ?? METRIC_MAP["health"];
        const color = scoreColor(info.score);
        const valueText = `${info.score}/100 ${scoreLabel(info.score)}`;
        const svg = buildSvg(info.label, valueText, color);

        return new Response(svg, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (e: unknown) {
        const errorSvg = buildSvg("RepoMind", "hata", "#6b7280");
        return new Response(errorSvg, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "no-cache",
            },
        });
    }
}
