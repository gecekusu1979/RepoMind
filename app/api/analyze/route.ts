import { NextRequest, NextResponse } from "next/server";
import {
    parseRepoUrl,
    fetchRepoMeta,
    fetchFileTree,
    fetchCriticalFiles,
    fetchCommitActivity,
} from "@/lib/gitProvider";
import { analyzeRepo } from "@/lib/analyzer";
import { runDevopsLinter } from "@/lib/devopsLinter";
import { auditPackages } from "@/lib/packageAudit";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rateLimit";

export const runtime = "edge";

const MAX_URL_LENGTH = 256;

export async function POST(req: NextRequest) {
    const rate = checkRateLimit(req, "analyze", 20, 60_000);
    if (!rate.ok) {
        return NextResponse.json(
            { error: "Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin." },
            { status: 429, headers: rateLimitHeaders(rate) }
        );
    }

    try {
        const contentType = req.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            return NextResponse.json(
                { error: "Content-Type application/json olmalıdır." },
                { status: 415 }
            );
        }

        const body = await req.json();
        const { url } = body as { url?: unknown };

        if (!url || typeof url !== "string") {
            return NextResponse.json(
                { error: "Eksik veya geçersiz URL parametresi." },
                { status: 400 }
            );
        }

        if (url.length > MAX_URL_LENGTH) {
            return NextResponse.json(
                { error: "URL çok uzun. Maksimum 256 karakter." },
                { status: 400 }
            );
        }

        let parsed;
        try {
            parsed = parseRepoUrl(url);
        } catch (e: unknown) {
            return NextResponse.json(
                { error: e instanceof Error ? e.message : "Geçersiz URL." },
                { status: 400 }
            );
        }

        let meta;
        try {
            meta = await fetchRepoMeta(parsed);
        } catch (e: unknown) {
            const msg =
                e instanceof Error ? e.message : "Depo bilgileri alınamadı.";
            const isNotFound = msg.includes("bulunamadı");
            const isRateLimit =
                msg.includes("istek limiti") || msg.includes("rate limit");
            const status = isNotFound ? 404 : isRateLimit ? 429 : 500;
            const finalMsg = isNotFound
                ? `${msg} (Eğer depo özelse, sistemin erişebilmesi için kişisel token kullanmalısınız.)`
                : msg;
            return NextResponse.json({ error: finalMsg }, { status });
        }

        let treeResult;
        try {
            treeResult = await fetchFileTree(parsed, meta.defaultBranch);
        } catch (e: unknown) {
            const msg =
                e instanceof Error ? e.message : "Dosya ağacı alınamadı.";
            const isRateLimit = msg.includes("istek limiti");
            return NextResponse.json({ error: msg }, { status: isRateLimit ? 429 : 500 });
        }

        const { items, truncated } = treeResult;

        const { readme, packageJson } = await fetchCriticalFiles(parsed, meta.defaultBranch, items);

        const [devopsAudit, commitActivity, packageAudit] = await Promise.all([
            runDevopsLinter(parsed, meta.defaultBranch, items),
            fetchCommitActivity(parsed),
            auditPackages(packageJson)
        ]);

        const analysis = analyzeRepo(items, readme, packageJson, truncated, meta);
        analysis.commitActivity = commitActivity;
        analysis.packageAudit = packageAudit;

        return NextResponse.json(
            { meta, analysis: { ...analysis, devopsAudit } },
            { headers: rateLimitHeaders(rate) }
        );
    } catch (e: unknown) {
        const msg =
            e instanceof Error ? e.message : "Sunucu hatası oluştu.";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
