import { FileTreeItem, TreemapNode, FileCategory } from "@/types/repo";

// ─────────────────────────────────────────────────────────────────
// Extension → Category + Color mapping
// ─────────────────────────────────────────────────────────────────

const EXT_CATEGORY: Record<string, FileCategory> = {
    // Code
    ts: "code", tsx: "code", js: "code", jsx: "code", mjs: "code", cjs: "code",
    py: "code", go: "code", rs: "code", c: "code", cpp: "code", cc: "code",
    h: "code", cs: "code", java: "code", rb: "code", php: "code", swift: "code",
    kt: "code", dart: "code", vue: "code", svelte: "code", ex: "code", exs: "code",
    // Styling & Markup
    css: "styling", scss: "styling", sass: "styling", less: "styling",
    html: "styling", htm: "styling", json: "styling", yaml: "styling",
    yml: "styling", md: "styling", mdx: "styling", rst: "styling", toml: "styling",
    xml: "styling", graphql: "styling", gql: "styling",
    // Assets
    svg: "assets", png: "assets", jpg: "assets", jpeg: "assets", gif: "assets",
    webp: "assets", ico: "assets", woff: "assets", woff2: "assets", ttf: "assets",
    otf: "assets", eot: "assets", mp4: "assets", mp3: "assets", wav: "assets",
    // Config & Build
    lock: "config", sh: "config", bash: "config", zsh: "config", ps1: "config",
    tf: "config", hcl: "config", dockerfile: "config", makefile: "config",
    env: "config", gitignore: "config", eslintrc: "config", prettierrc: "config",
};

const SPECIAL_CONFIG_FILES = new Set([
    "dockerfile", "makefile", ".gitignore", ".eslintrc", ".prettierrc",
    ".editorconfig", "procfile", ".nvmrc", ".node-version",
]);

export const CATEGORY_COLORS: Record<FileCategory | "other", string> = {
    code: "#6366f1", // Indigo
    styling: "#a855f7", // Purple
    assets: "#f59e0b", // Amber
    config: "#64748b", // Slate
    other: "#475569", // Slate darker
};

export function getFileCategory(path: string): FileCategory {
    const filename = path.split("/").pop()?.toLowerCase() ?? "";
    if (SPECIAL_CONFIG_FILES.has(filename)) return "config";
    const ext = filename.split(".").pop() ?? "";
    return EXT_CATEGORY[ext] ?? "other";
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// ─────────────────────────────────────────────────────────────────
// Build Hierarchy
// ─────────────────────────────────────────────────────────────────

interface DirMap {
    [key: string]: {
        children: DirMap;
        files: { name: string; path: string; size: number; category: FileCategory }[];
        totalSize: number;
    };
}

function ensureDir(map: DirMap, segments: string[]): DirMap[string] {
    let current = map;
    let node = null as DirMap[string] | null;
    for (const seg of segments) {
        if (!current[seg]) {
            current[seg] = { children: {}, files: [], totalSize: 0 };
        }
        node = current[seg];
        current = node.children;
    }
    return node!;
}

function buildDirMap(files: FileTreeItem[]): DirMap {
    const root: DirMap = {};
    for (const f of files) {
        if (f.type !== "blob") continue;
        const parts = f.path.split("/");
        const filename = parts.pop()!;
        const size = f.size ?? 0;
        const category = getFileCategory(f.path);

        if (parts.length === 0) {
            // root-level file
            if (!root["__root__"]) {
                root["__root__"] = { children: {}, files: [], totalSize: 0 };
            }
            root["__root__"].files.push({ name: filename, path: f.path, size, category });
            root["__root__"].totalSize += size;
        } else {
            const dir = ensureDir(root, parts);
            dir.files.push({ name: filename, path: f.path, size, category });
            // Bubble up sizes
            let cur = root;
            for (const seg of parts) {
                cur[seg].totalSize += size;
                cur = cur[seg].children;
            }
        }
    }
    return root;
}

function mapToNodes(map: DirMap, parentPath = "", depth = 0): TreemapNode[] {
    const nodes: TreemapNode[] = [];

    for (const [name, dir] of Object.entries(map)) {
        if (name === "__root__") {
            // Flatten root files directly
            for (const f of dir.files) {
                nodes.push({
                    name: f.name,
                    path: f.path,
                    value: f.size,
                    category: f.category,
                    depth,
                });
            }
            continue;
        }

        const path = parentPath ? `${parentPath}/${name}` : name;
        const childNodes: TreemapNode[] = [];

        // Add child directories
        const subDirNodes = mapToNodes(dir.children, path, depth + 1);
        childNodes.push(...subDirNodes);

        // Add files in this directory
        for (const f of dir.files) {
            childNodes.push({
                name: f.name,
                path: f.path,
                value: f.size,
                category: f.category,
                depth: depth + 1,
            });
        }

        if (childNodes.length > 0 || dir.totalSize > 0) {
            nodes.push({
                name,
                path,
                value: dir.totalSize,
                children: childNodes.length > 0 ? childNodes : undefined,
                depth,
            });
        }
    }

    return nodes.sort((a, b) => b.value - a.value);
}

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

export function buildTreemap(files: FileTreeItem[]): TreemapNode {
    const dirMap = buildDirMap(files);
    const children = mapToNodes(dirMap);
    const totalSize = children.reduce((s, c) => s + c.value, 0);
    return {
        name: "root",
        path: "",
        value: totalSize,
        children,
    };
}

/** Filter tree to a maximum depth from root, and truncate wide directories to prevent DOM explosion */
export function filterByDepth(node: TreemapNode, maxDepth: number, maxSiblings = 20): TreemapNode {
    if (!node.children || node.children.length === 0 || maxDepth <= 0) {
        return { ...node, children: undefined };
    }

    let children = [...node.children].sort((a, b) => b.value - a.value);

    // Hard ceiling on sibling rendering to avoid recharts SVG DOM OOM
    if (children.length > maxSiblings) {
        const topChildren = children.slice(0, maxSiblings);
        const rest = children.slice(maxSiblings);
        const restValue = rest.reduce((acc, c) => acc + c.value, 0);

        if (restValue > 0) {
            topChildren.push({
                name: `+${rest.length} items`,
                path: node.path ? `${node.path}/+other` : "+other",
                value: restValue,
                category: "other",
                depth: (node.depth ?? 0) + 1,
            });
        }
        children = topChildren;
    }

    return {
        ...node,
        children: children.map((c) => filterByDepth(c, maxDepth - 1, maxSiblings)),
    };
}

/** Flatten tree to recharts-compatible format (leaf nodes only, or collapsed dirs) */
export function flattenForRecharts(
    node: TreemapNode,
    maxDepth: number,
    maxSiblings = 20
): TreemapNode[] {
    const filtered = filterByDepth(node, maxDepth, maxSiblings);
    return filtered.children ?? [];
}
