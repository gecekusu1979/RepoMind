import { FileTreeItem } from "@/types/repo";

// ─────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────

export type TreemapCategory = 'code' | 'markup' | 'asset' | 'config' | 'aggregate' | 'other';

export interface TreemapNode {
    name: string;
    value?: number;
    sizeFormatted?: string;
    category?: TreemapCategory;
    color?: string;
    children?: TreemapNode[];
    isAggregate?: boolean;
    path?: string;
    depth?: number;
}

// ─────────────────────────────────────────────────────────────────
// Definitions & Sets
// ─────────────────────────────────────────────────────────────────

const EXCLUDE_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'vendor', 'target', '.venv', 'out']);

const CODE_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'swift', 'kt']);
const MARKUP_EXTS = new Set(['css', 'scss', 'html', 'json', 'yaml', 'yml', 'md', 'markdown']);
const ASSET_EXTS = new Set(['svg', 'png', 'jpg', 'jpeg', 'ico', 'webp', 'woff2', 'gif']);

export const CATEGORY_COLORS: Record<TreemapCategory, string> = {
    code: "#6366f1", // Indigo
    markup: "#ec4899", // Pink
    asset: "#f59e0b", // Amber
    config: "#71717a", // Zinc
    aggregate: "#3f3f46", // Slate-600
    other: "#71717a", // Fallback
};

// ─────────────────────────────────────────────────────────────────
// Formatters & Parsers
// ─────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function getFileCategory(filename: string): TreemapCategory {
    const lower = filename.toLowerCase();

    if (
        lower === 'dockerfile' ||
        lower.endsWith('.lock') ||
        lower.includes('.config.') ||
        lower.startsWith('.env.') ||
        lower === '.env' ||
        lower === 'package.json'
    ) {
        return 'config';
    }

    const ext = lower.split('.').pop() ?? '';

    if (CODE_EXTS.has(ext)) return 'code';
    if (MARKUP_EXTS.has(ext)) return 'markup';
    if (ASSET_EXTS.has(ext)) return 'asset';

    return 'config';
}

// ─────────────────────────────────────────────────────────────────
// Builder Classes (AST)
// ─────────────────────────────────────────────────────────────────

class DirBuilder {
    children = new Map<string, DirBuilder>();
    files: TreemapNode[] = [];
    totalBytes = 0;
    deeperFileCount = 0;
    deeperBytes = 0;
}

// ─────────────────────────────────────────────────────────────────
// Main Tree Construction (DOM-Bomb Guarded)
// ─────────────────────────────────────────────────────────────────

export function buildTreemap(files: FileTreeItem[]): TreemapNode {
    const root = new DirBuilder();

    // 1. Single Pass Build Phase
    for (const f of files) {
        if (f.type !== 'blob') continue;

        const rawParts = f.path.split('/');

        // Discard excluded directories entirely (e.g. node_modules, .git)
        if (rawParts.length > 0 && EXCLUDE_DIRS.has(rawParts[0])) {
            continue;
        }

        // Recharts cannot render 0-value rects. Fallback to 1024 per constraints.
        const size = typeof f.size === 'number' && f.size > 0 ? f.size : 1024;
        root.totalBytes += size;

        const name = rawParts[rawParts.length - 1];
        const cat = getFileCategory(name);
        const color = CATEGORY_COLORS[cat];

        const fileNode: TreemapNode = {
            name,
            value: size,
            sizeFormatted: formatBytes(size),
            category: cat,
            color,
            path: f.path,
        };

        const dirParts = rawParts.slice(0, -1);

        // Aggegate deep files instantly. Hard Depth Ceiling = 3
        // Parts lengths correspond to nested subfolders.
        if (dirParts.length > 3) {
            const allowedDirs = dirParts.slice(0, 3);
            let current = root;
            for (const d of allowedDirs) {
                if (!current.children.has(d)) current.children.set(d, new DirBuilder());
                current = current.children.get(d)!;
                current.totalBytes += size;
            }
            current.deeperFileCount += 1;
            current.deeperBytes += size;
        } else {
            let current = root;
            for (const d of dirParts) {
                if (!current.children.has(d)) current.children.set(d, new DirBuilder());
                current = current.children.get(d)!;
                current.totalBytes += size;
            }
            current.files.push(fileNode);
        }
    }

    // 2. Recursive Serialization Phase (with sibling ceilings)
    function convert(builder: DirBuilder, dirName: string, currentPath: string, depth = 0): TreemapNode {
        const childrenNodes: (TreemapNode & { rawValue: number })[] = [];

        // Push subdirectories
        for (const [subDirName, subBuilder] of builder.children.entries()) {
            const subPath = currentPath ? `${currentPath}/${subDirName}` : subDirName;
            const subNode = convert(subBuilder, subDirName, subPath, depth + 1);
            childrenNodes.push({
                ...subNode,
                rawValue: subNode.value ?? 0
            });
        }

        // Push concrete files
        for (const f of builder.files) {
            childrenNodes.push({
                ...f,
                depth: depth + 1,
                rawValue: f.value ?? 0
            });
        }

        // Push Depth Ceiling synthetic node
        if (builder.deeperFileCount > 0) {
            childrenNodes.push({
                name: `+${builder.deeperFileCount} deeper files`,
                value: builder.deeperBytes,
                sizeFormatted: formatBytes(builder.deeperBytes),
                category: 'aggregate',
                color: CATEGORY_COLORS['aggregate'],
                isAggregate: true,
                path: currentPath ? `${currentPath}/+deeper` : '+deeper',
                depth: depth + 1,
                rawValue: builder.deeperBytes
            });
        }

        // Apply Sibling Ceiling
        childrenNodes.sort((a, b) => b.rawValue - a.rawValue);

        let finalChildren: TreemapNode[] = childrenNodes;

        if (childrenNodes.length > 15) {
            const top14 = childrenNodes.slice(0, 14);
            const rest = childrenNodes.slice(14);

            const restBytes = rest.reduce((acc, n) => acc + n.rawValue, 0);
            const restCount = rest.length;

            top14.push({
                name: `+${restCount} other items`,
                value: restBytes,
                sizeFormatted: formatBytes(restBytes),
                category: 'aggregate',
                color: CATEGORY_COLORS['aggregate'],
                isAggregate: true,
                path: currentPath ? `${currentPath}/+other` : '+other',
                depth: depth + 1,
                rawValue: restBytes
            });

            finalChildren = top14;
        }

        return {
            name: dirName,
            value: builder.totalBytes,
            sizeFormatted: formatBytes(builder.totalBytes),
            children: finalChildren.length > 0 ? finalChildren : undefined,
            path: currentPath,
            depth,
        };
    }

    const rootNode = convert(root, "root", "", 0);

    // Safeguard for empty repos
    if (!rootNode.children) {
        rootNode.children = [];
    }

    return rootNode;
}

// ─────────────────────────────────────────────────────────────────
// Recharts Visualizer Compat
// ─────────────────────────────────────────────────────────────────

export function filterByDepth(node: TreemapNode, maxDepth: number): TreemapNode {
    if (!node.children || node.children.length === 0 || maxDepth <= 0) {
        return { ...node, children: undefined };
    }
    return {
        ...node,
        children: node.children.map(c => filterByDepth(c, maxDepth - 1))
    };
}

export function flattenForRecharts(node: TreemapNode, maxDepth: number): TreemapNode[] {
    const filtered = filterByDepth(node, maxDepth);
    return filtered.children ?? [];
}
