import { FileTreeItem, RepoMeta, ParsedRepoUrl, GitProvider } from "@/types/repo";

export function isValidSlug(segment: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(segment) && segment !== '..' && segment !== '.';
}

export const isValidGitHubSlug = isValidSlug; // backward compatibility for some routes

export function parseRepoUrl(input: string): ParsedRepoUrl {
    const clean = input.trim().replace(/\.git$/, "");

    // Check for gitlab instances
    const gitlabMatch = clean.match(/gitlab\.com[/:]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (gitlabMatch) {
        return { provider: "gitlab", owner: gitlabMatch[1], repo: gitlabMatch[2] };
    }

    // Check for bitbucket instances
    const bbMatch = clean.match(/bitbucket\.org[/:]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (bbMatch) {
        return { provider: "bitbucket", owner: bbMatch[1], repo: bbMatch[2] };
    }

    // Default to GitHub
    const urlMatch = clean.match(/github\.com[/:]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (urlMatch) {
        if (!isValidSlug(urlMatch[1]) || !isValidSlug(urlMatch[2])) throw new Error("Geçersiz depo.");
        return { provider: "github", owner: urlMatch[1], repo: urlMatch[2] };
    }
    const shortMatch = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (shortMatch) {
        if (!isValidSlug(shortMatch[1]) || !isValidSlug(shortMatch[2])) throw new Error("Geçersiz depo.");
        return { provider: "github", owner: shortMatch[1], repo: shortMatch[2] };
    }
    throw new Error("Geçersiz URL formatı. Örn: github.com/owner/repo");
}

function getGitHubHeaders(): HeadersInit {
    const headers: HeadersInit = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RepoMind-App",
    };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    return headers;
}

export async function fetchRepoMeta(parsed: ParsedRepoUrl): Promise<RepoMeta> {
    if (parsed.provider === "github") {
        const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
            headers: getGitHubHeaders(), next: { revalidate: 60 }
        });
        if (!res.ok) throw new Error("Depo bulunamadı veya limite takıldı.");
        const data = await res.json();
        return {
            owner: data.owner.login, name: data.name, fullName: data.full_name,
            description: data.description, stars: data.stargazers_count,
            forks: data.forks_count, language: data.language, topics: data.topics ?? [],
            defaultBranch: data.default_branch, createdAt: data.created_at,
            updatedAt: data.updated_at, license: data.license?.spdx_id ?? null,
            openIssues: data.open_issues_count, size: data.size, url: data.html_url,
            homepage: data.homepage ?? null, watchers: data.watchers_count
        };
    } else if (parsed.provider === "gitlab") {
        const id = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);
        const res = await fetch(`https://gitlab.com/api/v4/projects/${id}`, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error("GitLab depoya erişilemedi.");
        const data = await res.json();
        return {
            owner: parsed.owner, name: parsed.repo, fullName: `${parsed.owner}/${parsed.repo}`,
            description: data.description, stars: data.star_count, forks: data.forks_count,
            language: null, topics: data.tag_list ?? [], defaultBranch: data.default_branch,
            createdAt: data.created_at, updatedAt: data.last_activity_at,
            license: undefined as any, openIssues: 0, size: 0, url: data.web_url,
            homepage: null, watchers: 0
        };
    } else {
        // Bitbucket
        const res = await fetch(`https://api.bitbucket.org/2.0/repositories/${parsed.owner}/${parsed.repo}`, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error("Bitbucket depoya erişilemedi.");
        const data = await res.json();
        return {
            owner: parsed.owner, name: parsed.repo, fullName: `${parsed.owner}/${parsed.repo}`,
            description: data.description, stars: 0, forks: 0,
            language: data.language, topics: [], defaultBranch: data.mainbranch?.name ?? "main",
            createdAt: data.created_on, updatedAt: data.updated_on,
            license: null, openIssues: 0, size: data.size, url: data.links?.html?.href,
            homepage: null, watchers: 0
        };
    }
}

export async function fetchFileTree(parsed: ParsedRepoUrl, branch: string): Promise<{ items: FileTreeItem[]; truncated: boolean }> {
    if (parsed.provider === "github") {
        const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}?recursive=1`, {
            headers: getGitHubHeaders(), next: { revalidate: 60 }
        });
        if (!res.ok) throw new Error("Dosya ağacı alınamadı (GitHub).");
        const data = await res.json();
        return {
            items: (data.tree ?? []).map((item: any) => ({
                path: item.path, type: item.type as "blob" | "tree", size: item.size, sha: item.sha
            })),
            truncated: data.truncated
        };
    } else if (parsed.provider === "gitlab") {
        const id = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);
        const res = await fetch(`https://gitlab.com/api/v4/projects/${id}/repository/tree?ref=${branch}&recursive=true&per_page=100`, { next: { revalidate: 60 } });
        if (!res.ok) throw new Error("Dosya ağacı alınamadı (GitLab).");
        const data = await res.json();
        const items = data.map((item: any) => ({
            path: item.path, type: item.type === "tree" ? "tree" : "blob", size: 0, sha: item.id
        }));
        return { items, truncated: true };
    } else {
        return { items: [], truncated: true }; // Bitbucket file tree lookup too slow for edge, just skip to critical files 
    }
}

export async function fetchRawFile(parsed: ParsedRepoUrl, path: string, branch: string): Promise<string | null> {
    try {
        if (parsed.provider === "github") {
            const res = await fetch(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/${path}`, {
                headers: getGitHubHeaders(), next: { revalidate: 60 }
            });
            return res.ok ? await res.text() : null;
        } else if (parsed.provider === "gitlab") {
            const id = encodeURIComponent(`${parsed.owner}/${parsed.repo}`);
            const encodedPath = encodeURIComponent(path);
            const res = await fetch(`https://gitlab.com/api/v4/projects/${id}/repository/files/${encodedPath}/raw?ref=${branch}`, { next: { revalidate: 60 } });
            return res.ok ? await res.text() : null;
        } else {
            const res = await fetch(`https://api.bitbucket.org/2.0/repositories/${parsed.owner}/${parsed.repo}/src/${branch}/${path}`, { next: { revalidate: 60 } });
            return res.ok ? await res.text() : null;
        }
    } catch {
        return null;
    }
}

export async function fetchCriticalFiles(
    parsed: ParsedRepoUrl,
    branch: string,
    tree: FileTreeItem[]
): Promise<{ readme: string | null; packageJson: string | null }> {
    const paths = new Set(tree.map((f) => f.path.toLowerCase()));
    const readmePath = ["README.md", "readme.md", "Readme.md"].find((p) =>
        paths.has(p.toLowerCase())
    );
    const pkgPath = paths.has("package.json") ? "package.json" : null;

    const [readme, packageJson] = await Promise.all([
        readmePath ? fetchRawFile(parsed, readmePath, branch) : Promise.resolve(null),
        pkgPath ? fetchRawFile(parsed, pkgPath, branch) : Promise.resolve(null),
    ]);
    return { readme, packageJson };
}

export async function fetchCommitActivity(parsed: ParsedRepoUrl): Promise<{ date: string; count: number }[]> {
    if (parsed.provider === "github") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?since=${thirtyDaysAgo.toISOString()}&per_page=100`, {
            headers: getGitHubHeaders(), next: { revalidate: 60 }
        });
        if (!res.ok) return [];
        const commits = await res.json();
        const map = new Map<string, number>();
        for (const c of commits) {
            const d = c.commit.author.date.split("T")[0];
            map.set(d, (map.get(d) || 0) + 1);
        }
        return Array.from(map.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
    }
    return []; // NotImplemented for Gitlab/BB yet
}
