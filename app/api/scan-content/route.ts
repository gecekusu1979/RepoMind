/**
 * app/api/scan-content/route.ts
 *
 * İçerik tabanlı gizli bilgi tarama API rotası.
 * Edge Runtime uyumlu — contentScanner.ts ile çalışır.
 *
 * POST /api/scan-content
 * Body: { owner: string; repo: string; branch: string; paths: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { scanFileContents } from "@/lib/contentScanner";
import { isValidGitHubSlug } from "@/lib/gitProvider";

// Node.js runtime zorunlu — SecretDetector node:crypto kullanıyor
export const runtime = "nodejs";

const MAX_FILES = 30;
const GITHUB_RAW = "https://raw.githubusercontent.com";

async function fetchRaw(
    owner: string,
    repo: string,
    branch: string,
    filePath: string,
    token?: string
): Promise<string | null> {
    const url = `${GITHUB_RAW}/${owner}/${repo}/${branch}/${filePath}`;
    const headers: Record<string, string> = { Accept: "text/plain" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
        const res = await fetch(url, { headers });
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}

const TEXT_EXTS = new Set([
    "ts", "tsx", "js", "jsx", "mjs", "cjs",
    "py", "rb", "go", "rs", "java", "cs", "cpp", "c", "php", "swift", "kt",
    "sh", "bash", "zsh", "fish",
    "yaml", "yml", "json", "toml", "ini", "env", "cfg", "conf",
    "tf", "hcl", "md", "txt", "html", "xml", "svg",
    "Dockerfile", "dockerfile", "Gemfile", "Makefile", "makefile",
]);

function isTextFile(filePath: string): boolean {
    const base = filePath.split("/").pop() ?? filePath;
    const ext = base.includes(".") ? base.split(".").pop()! : base;
    return TEXT_EXTS.has(ext) || TEXT_EXTS.has(base);
}

export async function POST(req: NextRequest) {
    const rate = checkRateLimit(req, "scan-content", 10, 60_000);
    if (!rate.ok) {
        return NextResponse.json(
            { error: "Çok fazla istek. Lütfen bir süre bekleyin." },
            { status: 429, headers: rateLimitHeaders(rate) }
        );
    }

    try {
        const body = await req.json();
        const { owner, repo, branch, paths } = body as {
            owner?: unknown;
            repo?: unknown;
            branch?: unknown;
            paths?: unknown;
        };

        if (
            typeof owner !== "string" || !isValidGitHubSlug(owner) ||
            typeof repo !== "string" || !isValidGitHubSlug(repo) ||
            typeof branch !== "string" || !isValidGitHubSlug(branch) ||
            !Array.isArray(paths)
        ) {
            return NextResponse.json({ error: "Geçersiz parametre." }, { status: 400 });
        }

        const token = process.env.GITHUB_TOKEN;

        const candidates = (paths as unknown[])
            .filter((p): p is string => typeof p === "string" && isTextFile(p))
            .slice(0, MAX_FILES);

        const fetched = await Promise.all(
            candidates.map(async (p) => {
                const content = await fetchRaw(owner, repo, branch, p, token);
                return content !== null ? { path: p, content } : null;
            })
        );

        const files = fetched.filter(
            (f): f is { path: string; content: string } => f !== null
        );

        const result = scanFileContents(files);
        return NextResponse.json(result, { headers: rateLimitHeaders(rate) });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Sunucu hatası.";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
