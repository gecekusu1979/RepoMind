import { NextRequest, NextResponse } from "next/server";
import { isValidGitHubSlug } from "@/lib/github";
import { classifyPulse } from "@/lib/repoPulse";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rateLimit";

export const runtime = "edge";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ owner: string; repo: string }> }
) {
    const rate = checkRateLimit(req, "pulse", 30, 60_000);
    if (!rate.ok) {
        return NextResponse.json(
            { error: "Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin." },
            { status: 429, headers: rateLimitHeaders(rate) }
        );
    }

    const { owner, repo } = await params;

    if (!isValidGitHubSlug(owner) || !isValidGitHubSlug(repo)) {
        return NextResponse.json({ error: "Geçersiz depo adı." }, { status: 400 });
    }

    try {
        const headers: HeadersInit = {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "RepoMind-App",
        };
        const token = process.env.GITHUB_TOKEN;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
            { headers, next: { revalidate: 300 } }
        );

        if (!res.ok) {
            return NextResponse.json(
                { error: `GitHub API hatası: ${res.status}` },
                { status: res.status >= 500 ? 502 : res.status }
            );
        }

        const commits = await res.json();
        if (!Array.isArray(commits) || commits.length === 0) {
            return NextResponse.json({ error: "Commit bulunamadı." }, { status: 404 });
        }

        const commit = commits[0];
        const rawDate: string =
            commit?.commit?.committer?.date ?? commit?.commit?.author?.date ?? "";

        if (!rawDate) {
            return NextResponse.json({ error: "Commit tarihi okunamadı." }, { status: 500 });
        }

        const commitDate = new Date(rawDate);
        const daysSinceLastCommit = Math.floor(
            (Date.now() - commitDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const status = classifyPulse(daysSinceLastCommit);

        return NextResponse.json({
            daysSinceLastCommit,
            status,
            lastCommitDate: rawDate,
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Sunucu hatası.";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
