import { NextRequest, NextResponse } from "next/server";
import {
    parseGitHubUrl,
    fetchRepoMeta,
    fetchFileTree,
    fetchCriticalFiles,
} from "@/lib/github";
import { analyzeRepo } from "@/lib/analyzer";

export const runtime = "edge";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url } = body as { url?: string };

        if (!url || typeof url !== "string") {
            return NextResponse.json(
                { error: "Eksik veya geçersiz URL parametresi." },
                { status: 400 }
            );
        }

        let parsed;
        try {
            parsed = parseGitHubUrl(url);
        } catch (e: unknown) {
            return NextResponse.json(
                { error: e instanceof Error ? e.message : "Geçersiz URL." },
                { status: 400 }
            );
        }

        const { owner, repo } = parsed;

        // Fetch repo metadata
        let meta;
        try {
            meta = await fetchRepoMeta(owner, repo);
        } catch (e: unknown) {
            const msg =
                e instanceof Error ? e.message : "Depo bilgileri alınamadı.";
            const isNotFound = msg.includes("bulunamadı");
            const isRateLimit =
                msg.includes("istek limiti") || msg.includes("rate limit");
            const status = isNotFound ? 404 : isRateLimit ? 429 : 500;
            return NextResponse.json({ error: msg }, { status });
        }

        // Fetch file tree
        let treeResult;
        try {
            treeResult = await fetchFileTree(owner, repo, meta.defaultBranch);
        } catch (e: unknown) {
            const msg =
                e instanceof Error ? e.message : "Dosya ağacı alınamadı.";
            const isRateLimit = msg.includes("istek limiti");
            return NextResponse.json({ error: msg }, { status: isRateLimit ? 429 : 500 });
        }

        const { items, truncated } = treeResult;

        // Fetch README + package.json
        const { readme, packageJson } = await fetchCriticalFiles(
            owner,
            repo,
            meta.defaultBranch,
            items
        );

        const analysis = analyzeRepo(items, readme, packageJson, truncated, meta);

        return NextResponse.json({ meta, analysis });
    } catch (e: unknown) {
        const msg =
            e instanceof Error ? e.message : "Sunucu hatası oluştu.";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
