import { NextRequest, NextResponse } from "next/server";
import { isValidGitHubSlug } from "@/lib/github";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rateLimit";

export const runtime = "edge";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ owner: string; repo: string }> }
) {
    const rate = checkRateLimit(req, "contributors", 30, 60_000);
    if (!rate.ok) {
        return NextResponse.json(
            { error: "Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin." },
            { status: 429, headers: rateLimitHeaders(rate) }
        );
    }

    const { owner, repo } = await params;

    if (!isValidGitHubSlug(owner) || !isValidGitHubSlug(repo)) {
        return NextResponse.json({ error: 'Geçersiz parametre formatı.' }, { status: 400 });
    }

    // We proxy this to avoid exposing GH token and to get higher rate limits with it
    const token = process.env.GITHUB_TOKEN;
    const headers: HeadersInit = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "RepoMind-Analyze",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=10`, {
            headers,
            next: { revalidate: 3600 } // Cache at edge for 1 hour
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: "Katkıda bulunanlar alınamadı." },
                { status: res.status === 404 ? 404 : res.status === 403 ? 403 : 502 }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (_e: unknown) {
        return NextResponse.json(
            { error: "API isteğinde hata oluştu." },
            { status: 500 }
        );
    }
}
