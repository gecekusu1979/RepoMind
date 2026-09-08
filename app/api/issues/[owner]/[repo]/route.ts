import { NextRequest, NextResponse } from "next/server";
import { processIssues } from "@/lib/issues";
import { isValidGitHubSlug } from "@/lib/github";

export const runtime = "edge";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ owner: string; repo: string }> }
) {
    const { owner, repo } = await params;

    if (!isValidGitHubSlug(owner) || !isValidGitHubSlug(repo)) {
        return NextResponse.json({ error: 'Geçersiz parametre formatı.' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const headers: HeadersInit = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "RepoMind-Analyze",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        // Fetch issues with good first issue and help wanted labels
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&labels=good%20first%20issue,help%20wanted&per_page=10`, {
            headers,
            next: { revalidate: 3600 }
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: "Issue verisi alınamadı." },
                { status: res.status }
            );
        }

        const data = await res.json();
        const raw = Array.isArray(data) ? data : [];
        const processed = processIssues(raw);

        return NextResponse.json(processed);
    } catch {
        return NextResponse.json(
            { error: "API isteğinde hata oluştu." },
            { status: 500 }
        );
    }
}
