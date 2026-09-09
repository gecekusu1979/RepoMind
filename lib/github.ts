import { FileTreeItem, RepoMeta, ParsedGitHubUrl } from "@/types/repo";

const GITHUB_API = "https://api.github.com";

function getHeaders(): HeadersInit {
    const headers: HeadersInit = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RepoMind-App",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

export function isValidGitHubSlug(segment: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(segment) && segment !== '..' && segment !== '.';
}

export function parseGitHubUrl(input: string): ParsedGitHubUrl {
    const clean = input.trim().replace(/\.git$/, "");
    const urlMatch = clean.match(
        /github\.com[/:]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
    );
    if (urlMatch) {
        if (!isValidGitHubSlug(urlMatch[1]) || !isValidGitHubSlug(urlMatch[2])) {
            throw new Error("Geçersiz depo veya kullanıcı adı.");
        }
        return { owner: urlMatch[1], repo: urlMatch[2] };
    }
    const shortMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (shortMatch) {
        if (!isValidGitHubSlug(shortMatch[1]) || !isValidGitHubSlug(shortMatch[2])) {
            throw new Error("Geçersiz depo veya kullanıcı adı.");
        }
        return { owner: shortMatch[1], repo: shortMatch[2] };
    }
    throw new Error(
        "Geçersiz GitHub URL'si. Lütfen şu formatı kullanın: https://github.com/owner/repo veya owner/repo"
    );
}

function buildRateLimitError(res: Response): Error {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    const hasToken = !!process.env.GITHUB_TOKEN;

    if (remaining === "0" || res.status === 403) {
        const resetDate = reset
            ? new Date(parseInt(reset) * 1000).toLocaleTimeString("tr-TR")
            : "biraz sonra";
        if (hasToken) {
            return new Error(
                `GitHub API istek limiti aşıldı. Sıfırlanma saati: ${resetDate}.`
            );
        }
        return new Error(
            `GitHub anonim istek limiti (60 istek/saat) aşıldı. Lütfen bir süre sonra tekrar deneyin veya opsiyonel bir token ekleyin. Sıfırlanma saati: ${resetDate}.`
        );
    }
    return new Error("Erişim reddedildi. Depo gizli olabilir.");
}

export async function fetchRepoMeta(
    owner: string,
    repo: string
): Promise<RepoMeta> {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
        headers: getHeaders(),
        next: { revalidate: 60 },
    });

    if (res.status === 404) {
        throw new Error(`"${owner}/${repo}" deposu bulunamadı.`);
    }
    if (res.status === 403 || res.status === 429) {
        throw buildRateLimitError(res);
    }
    if (!res.ok) {
        throw new Error(
            `GitHub API hatası: ${res.status} ${res.statusText}`
        );
    }

    const data = await res.json();
    return {
        owner: data.owner.login,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        stars: data.stargazers_count,
        forks: data.forks_count,
        language: data.language,
        topics: data.topics ?? [],
        defaultBranch: data.default_branch,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        license: data.license?.spdx_id ?? null,
        openIssues: data.open_issues_count,
        size: data.size,
        url: data.html_url,
        homepage: data.homepage ?? null,
        watchers: data.watchers_count,
    };
}

export async function fetchFileTree(
    owner: string,
    repo: string,
    branch: string
): Promise<{ items: FileTreeItem[]; truncated: boolean }> {
    const res = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        {
            headers: getHeaders(),
            next: { revalidate: 60 },
        }
    );

    if (res.status === 404) {
        throw new Error(
            `"${branch}" dalı ${owner}/${repo} deposunda bulunamadı.`
        );
    }
    if (res.status === 403 || res.status === 429) {
        throw buildRateLimitError(res);
    }
    if (!res.ok) {
        throw new Error(
            `Dosya ağacı alınamadı: ${res.status} ${res.statusText}`
        );
    }

    const data = await res.json();
    const items: FileTreeItem[] = (data.tree ?? []).map(
        (item: { path: string; type: string; size?: number; sha: string }) => ({
            path: item.path,
            type: item.type as "blob" | "tree",
            size: item.size,
            sha: item.sha,
        })
    );

    return { items, truncated: data.truncated === true };
}

export async function fetchRawFile(
    owner: string,
    repo: string,
    path: string,
    branch: string
): Promise<string | null> {
    const MAX_BYTES = 512 * 1024;
    try {
        const headers: HeadersInit = { "User-Agent": "RepoMind-App" };
        const token = process.env.GITHUB_TOKEN;
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
            { headers, next: { revalidate: 60 } }
        );
        if (!res.ok) return null;

        const contentLength = res.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) return null;

        const text = await res.text();
        if (text.length > MAX_BYTES) return text.slice(0, MAX_BYTES);
        return text;
    } catch {
        return null;
    }
}

export async function fetchCriticalFiles(
    owner: string,
    repo: string,
    branch: string,
    tree: FileTreeItem[]
): Promise<{ readme: string | null; packageJson: string | null }> {
    const paths = new Set(tree.map((f) => f.path.toLowerCase()));

    const readmePath = ["README.md", "readme.md", "Readme.md"].find((p) =>
        paths.has(p.toLowerCase())
    );
    const pkgPath = paths.has("package.json") ? "package.json" : null;

    const [readme, packageJson] = await Promise.all([
        readmePath
            ? fetchRawFile(owner, repo, readmePath, branch)
            : Promise.resolve(null),
        pkgPath
            ? fetchRawFile(owner, repo, pkgPath, branch)
            : Promise.resolve(null),
    ]);

    return { readme, packageJson };
}
