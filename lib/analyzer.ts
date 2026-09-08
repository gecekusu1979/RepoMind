import {
    FileTreeItem,
    AnalysisResult,
    ArchitectureBucket,
    MetricScores,
    RepoMeta,
} from "@/types/repo";
import { runSecurityScan } from "@/lib/securityScanner";
import { checkActivity } from "@/lib/activityChecker";
import { auditPackages } from "@/lib/packageAudit";

// ───────────────────────────────────────────────────────────────
// O(1) Set Lookups for Fast Hierarchy Resolution (Replaces Regex)
// ───────────────────────────────────────────────────────────────
const FRONTEND_DIRS = new Set(["src", "app", "pages", "components", "views", "ui", "client", "frontend", "web"]);
const BACKEND_DIRS = new Set(["api", "controllers", "services", "routes", "server", "handlers", "middleware", "backend"]);
const DB_DIRS = new Set(["prisma", "drizzle", "migrations", "models", "schemas", "sql", "db", "database", "seeds"]);
const INFRA_DIRS = new Set([".github", "docker", "k8s", "kubernetes", "terraform", "deploy", "infra", ".aws", "ci", "ansible", "helm"]);
const TEST_DIRS = new Set(["__tests__", "tests", "test", "spec", "e2e", "cypress", "playwright"]);
const CONFIG_DIRS = new Set(["config", "configs", "settings", ".vscode", ".husky", "scripts", "tools", "build", "dist", ".next"]);

const ARCH_COLORS: Record<ArchitectureBucket["name"], string> = {
    Frontend: "#6366f1",
    Backend: "#22c55e",
    Database: "#f59e0b",
    "Infra/DevOps": "#3b82f6",
    Tests: "#ec4899",
    Config: "#8b5cf6",
    Other: "#64748b",
};

const ARCH_ICONS: Record<ArchitectureBucket["name"], string> = {
    Frontend: "🎨",
    Backend: "⚙️",
    Database: "🗄️",
    "Infra/DevOps": "🚀",
    Tests: "🧪",
    Config: "🔧",
    Other: "📁",
};

const EXECUTABLE_EXTS = new Set(["js", "ts", "jsx", "tsx", "py", "go", "rs", "java", "c", "cpp", "cs", "php", "rb", "swift", "kt"]);
const DOC_EXTS = new Set(["md", "mdx", "rst", "txt"]);

// ───────────────────────────────────────────────────────────────
// Architecture Detection
// ───────────────────────────────────────────────────────────────
function detectArchitecture(
    files: FileTreeItem[]
): ArchitectureBucket[] {
    const buckets: Record<ArchitectureBucket["name"], string[]> = {
        Frontend: [], Backend: [], Database: [], "Infra/DevOps": [],
        Tests: [], Config: [], Other: [],
    };

    const order: ArchitectureBucket["name"][] = [
        "Frontend", "Backend", "Database", "Infra/DevOps", "Tests", "Config", "Other",
    ];

    for (const file of files) {
        if (file.type !== "blob") continue;

        let bucketName: ArchitectureBucket["name"] = "Other";
        const parts = file.path.toLowerCase().split("/");

        if (parts.length > 1) {
            const rootDir = parts[0];
            if (FRONTEND_DIRS.has(rootDir)) bucketName = "Frontend";
            else if (BACKEND_DIRS.has(rootDir)) bucketName = "Backend";
            else if (DB_DIRS.has(rootDir)) bucketName = "Database";
            else if (INFRA_DIRS.has(rootDir)) bucketName = "Infra/DevOps";
            else if (TEST_DIRS.has(rootDir)) bucketName = "Tests";
            else if (CONFIG_DIRS.has(rootDir)) bucketName = "Config";
        }

        buckets[bucketName].push(file.path);
    }

    return order
        .map(
            (name): ArchitectureBucket => ({
                name,
                icon: ARCH_ICONS[name],
                paths: buckets[name],
                color: ARCH_COLORS[name],
            })
        )
        .filter((b) => b.paths.length > 0);
}

// ───────────────────────────────────────────────────────────────
// Test Score
// ───────────────────────────────────────────────────────────────
function calcTestScore(files: FileTreeItem[]): number {
    let execCount = 0;
    let testCount = 0;

    for (const f of files) {
        if (f.type !== "blob") continue;
        const lowerPath = f.path.toLowerCase();

        const isTest = lowerPath.includes(".test.") || lowerPath.includes(".spec.") || lowerPath.includes("__tests__/");
        if (isTest) {
            testCount++;
        }

        const ext = lowerPath.split(".").pop();
        if (ext && EXECUTABLE_EXTS.has(ext)) {
            execCount++;
        }
    }

    if (execCount === 0) return 0;
    const rawRatio = testCount / execCount;
    // 10% test ratio = 60 score, 30% = 100
    return Math.min(100, Math.round((rawRatio / 0.3) * 100));
}

// ───────────────────────────────────────────────────────────────
// Doc Score
// ───────────────────────────────────────────────────────────────
function calcDocScore(
    files: FileTreeItem[],
    readme: string | null
): number {
    let score = 0;
    const paths = files.map((f) => f.path.toLowerCase());

    // README quality (up to 50 pts)
    if (readme) {
        score += 20;
        if (readme.length > 1000) score += 15;
        if (readme.length > 3000) score += 15;
    }

    // CONTRIBUTING (15 pts)
    if (paths.some((p) => p === "contributing.md" || p.endsWith("/contributing.md")))
        score += 15;

    // LICENSE (15 pts)
    if (paths.some((p) => p === "license" || p === "license.md" || p.startsWith("license")))
        score += 15;

    // Inline docs (10 pts)
    let docCount = 0;
    for (const p of paths) {
        if (p === "readme.md") continue;
        const ext = p.split(".").pop();
        if (ext && DOC_EXTS.has(ext)) docCount++;
    }

    if (docCount >= 3) score += 10;
    else if (docCount >= 1) score += 5;

    // Changelog (10 pts)
    if (paths.some((p) => p.includes("changelog") || p.includes("history.md")))
        score += 10;

    return Math.min(100, score);
}

// ───────────────────────────────────────────────────────────────
// Health Score
// ───────────────────────────────────────────────────────────────
function calcHealthScore(files: FileTreeItem[]): number {
    let score = 100;
    const paths = files.map((f) => f.path);
    const pathSet = new Set(paths.map((p) => p.toLowerCase()));

    // Penalize deeply nested files (> 5 levels)
    const deepFiles = paths.filter((p) => p.split("/").length > 5);
    const deepRatio = deepFiles.length / Math.max(paths.length, 1);
    score -= Math.round(deepRatio * 30);

    // Missing .gitignore (-10)
    if (!pathSet.has(".gitignore")) score -= 10;

    // Missing linter/formatter configs
    const linterFiles = [".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.cjs",
        ".eslintrc.yaml", ".eslintrc.yml", "eslint.config.js", "eslint.config.mjs",
        ".prettierrc", ".prettierrc.js", ".prettierrc.json", "prettier.config.js",
        "biome.json", ".biome.json"];
    const hasLinter = linterFiles.some((l) => pathSet.has(l) || pathSet.has(`./${l}`));
    if (!hasLinter) score -= 10;

    // Missing tsconfig
    if (!pathSet.has("tsconfig.json")) score -= 10;

    // .env file committed (severe penalty)
    if (pathSet.has(".env") || paths.some((p) => p === ".env")) score -= 20;

    // Monolithic single top-level directory (all files in one folder)
    const topDirs = new Set(paths.map((p) => p.split("/")[0]).filter(Boolean));
    if (topDirs.size === 1 && paths.length > 20) score -= 15;

    // Lockfile present (+5 bonus captured by clamping)
    if (
        pathSet.has("package-lock.json") ||
        pathSet.has("yarn.lock") ||
        pathSet.has("pnpm-lock.yaml") ||
        pathSet.has("bun.lockb")
    ) {
        score += 5;
    }

    return Math.max(0, Math.min(100, score));
}

// ───────────────────────────────────────────────────────────────
// Good Practices Detection
// ───────────────────────────────────────────────────────────────
function detectGoodPractices(files: FileTreeItem[]): string[] {
    const practices: string[] = [];
    const pathSet = new Set(
        files.map((f) => f.path.toLowerCase())
    );

    if (
        pathSet.has(".github/workflows") ||
        files.some((f) => f.path.startsWith(".github/workflows/"))
    )
        practices.push("✅ CI/CD workflow configured (GitHub Actions)");

    if (pathSet.has("tsconfig.json")) practices.push("✅ TypeScript configured");

    if (
        files.some((f) =>
            ["dockerfile", "docker-compose.yml", "docker-compose.yaml"].includes(
                f.path.toLowerCase()
            )
        )
    )
        practices.push("✅ Docker / containerization provided");

    if (
        pathSet.has("package-lock.json") ||
        pathSet.has("yarn.lock") ||
        pathSet.has("pnpm-lock.yaml") ||
        pathSet.has("bun.lockb")
    )
        practices.push("✅ Lockfile present (deterministic installs)");

    if (pathSet.has(".gitignore")) practices.push("✅ .gitignore present");

    if (
        pathSet.has("license") ||
        pathSet.has("license.md") ||
        pathSet.has("license.txt")
    )
        practices.push("✅ Open-source license included");

    let hasTests = false;
    for (const f of files) {
        const lp = f.path.toLowerCase();
        if (lp.includes(".test.") || lp.includes(".spec.") || lp.includes("__tests__/")) {
            hasTests = true;
            break;
        }
    }
    if (hasTests) practices.push("✅ Test suite detected");

    const linterPatterns = [
        ".eslintrc",
        ".eslintrc.js",
        ".eslintrc.json",
        "eslint.config.js",
        "biome.json",
        ".prettierrc",
    ];
    if (linterPatterns.some((l) => pathSet.has(l)))
        practices.push("✅ Linter/formatter configured");

    if (
        pathSet.has("contributing.md") ||
        files.some((f) => f.path.toLowerCase() === "contributing.md")
    )
        practices.push("✅ CONTRIBUTING guide present");

    if (
        pathSet.has("security.md") ||
        files.some((f) => f.path.toLowerCase() === "security.md")
    )
        practices.push("✅ Security policy defined");

    if (
        files.some((f) =>
            f.path
                .toLowerCase()
                .match(/helm|k8s|kubernetes|terraform|pulumi|cdk/)
        )
    )
        practices.push("✅ Infrastructure-as-Code present");

    return practices;
}

// ───────────────────────────────────────────────────────────────
// Potential Problems Detection
// ───────────────────────────────────────────────────────────────
function detectProblems(
    files: FileTreeItem[],
    testScore: number
): string[] {
    const problems: string[] = [];
    const paths = files.map((f) => f.path);
    const pathSet = new Set(paths.map((p) => p.toLowerCase()));
    const blobs = files.filter((f) => f.type === "blob");

    if (testScore < 5) problems.push("🔴 No test suite detected");
    else if (testScore < 20) problems.push("🟡 Test coverage appears low");

    if (paths.some((p) => p === ".env" || p.match(/^\.env$/)))
        problems.push("🔴 .env file may be committed (secrets risk!)");

    if (!pathSet.has("license") && !pathSet.has("license.md") && !pathSet.has("license.txt"))
        problems.push("🟡 No open-source license found");

    // Very large files (> 500KB)
    const largeFiles = blobs.filter((f) => (f.size ?? 0) > 500_000);
    if (largeFiles.length > 0)
        problems.push(
            `🟡 ${largeFiles.length} large file(s) > 500KB (consider Git LFS)`
        );

    const deepFiles = paths.filter((p) => p.split("/").length > 6);
    if (deepFiles.length > paths.length * 0.2)
        problems.push("🟡 High nesting depth — consider restructuring");

    if (!pathSet.has(".gitignore"))
        problems.push("🟡 No .gitignore file found");

    // No CI
    const hasCi = files.some(
        (f) =>
            f.path.startsWith(".github/workflows/") ||
            pathSet.has(".travis.yml") ||
            pathSet.has("circleci/config.yml") ||
            pathSet.has(".circleci/config.yml")
    );
    if (!hasCi) problems.push("🟡 No CI/CD pipeline detected");

    // Monolithic all-flat structure
    const topDirs = new Set(paths.map((p) => p.split("/")[0]).filter(Boolean));
    if (topDirs.size === 1 && blobs.length > 20)
        problems.push("🟡 Monolithic flat structure — consider splitting by concern");

    // Very old last update is handled outside analyzer

    return problems;
}

// ───────────────────────────────────────────────────────────────
// Language Distribution
// ───────────────────────────────────────────────────────────────
const EXT_TO_LANG: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript",
    js: "JavaScript",
    jsx: "JavaScript",
    mjs: "JavaScript",
    cjs: "JavaScript",
    py: "Python",
    rb: "Ruby",
    go: "Go",
    rs: "Rust",
    java: "Java",
    cs: "C#",
    cpp: "C++",
    cc: "C++",
    c: "C",
    h: "C/C++",
    php: "PHP",
    swift: "Swift",
    kt: "Kotlin",
    dart: "Dart",
    vue: "Vue",
    svelte: "Svelte",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    sass: "Sass",
    less: "Less",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    md: "Markdown",
    sh: "Shell",
    bash: "Shell",
    dockerfile: "Docker",
    tf: "Terraform",
};

function calcLanguages(
    files: FileTreeItem[]
): { lang: string; count: number; percentage: number }[] {
    const counts: Record<string, number> = {};
    for (const f of files) {
        if (f.type !== "blob") continue;
        const ext = f.path.split(".").pop()?.toLowerCase() ?? "";
        const lang = EXT_TO_LANG[ext];
        if (lang) {
            counts[lang] = (counts[lang] ?? 0) + 1;
        }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
        .map(([lang, count]) => ({
            lang,
            count,
            percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
}

// ───────────────────────────────────────────────────────────────
// Dependency Extraction
// ───────────────────────────────────────────────────────────────
function parsePackageJson(raw: string | null): {
    deps: string[];
    devDeps: string[];
} {
    if (!raw) return { deps: [], devDeps: [] };
    try {
        const pkg = JSON.parse(raw);
        const deps = Object.keys(pkg.dependencies ?? {});
        const devDeps = Object.keys(pkg.devDependencies ?? {});
        return { deps, devDeps };
    } catch {
        return { deps: [], devDeps: [] };
    }
}

// ───────────────────────────────────────────────────────────────
// Main Analyzer
// ───────────────────────────────────────────────────────────────
export function analyzeRepo(
    files: FileTreeItem[],
    readme: string | null,
    packageJson: string | null,
    truncated: boolean,
    meta?: RepoMeta
): AnalysisResult {
    const blobs = files.filter((f) => f.type === "blob");

    const totalFiles = blobs.length;
    const totalSize = blobs.reduce((acc, f) => acc + (f.size ?? 0), 0);

    const architecture = detectArchitecture(files);

    const testScore = calcTestScore(files);
    const docScore = calcDocScore(files, readme);
    const healthScore = calcHealthScore(files);
    const overall = Math.round((testScore + docScore + healthScore) / 3);

    const metrics: MetricScores = { testScore, docScore, healthScore, overall };

    const goodPractices = detectGoodPractices(files);
    const potentialProblems = detectProblems(files, testScore);

    const topLanguages = calcLanguages(files);

    const { deps, devDeps } = parsePackageJson(packageJson);

    const directoryDepth = Math.max(
        ...blobs.map((f) => f.path.split("/").length),
        0
    );

    const hasPackageJson = packageJson !== null;

    const firstLevelPaths = new Set<string>();
    for (const f of files) {
        const parts = f.path.split("/");
        firstLevelPaths.add(parts[0]);
        if (parts.length > 1) firstLevelPaths.add(`${parts[0]}/${parts[1]}`);
    }
    const firstLevelTree = Array.from(firstLevelPaths).slice(0, 40);

    const readmeSummary = readme ? readme.slice(0, 1200) : "";

    const security = runSecurityScan(files);
    const activity = meta
        ? checkActivity(meta.updatedAt, meta.createdAt)
        : checkActivity(new Date().toISOString(), new Date().toISOString());
    const packageAudit = auditPackages(packageJson);

    return {
        totalFiles,
        totalSize,
        architecture,
        metrics,
        goodPractices,
        potentialProblems,
        topLanguages,
        directoryDepth,
        hasPackageJson,
        dependencies: deps,
        devDependencies: devDeps,
        readmeSummary,
        firstLevelTree,
        truncated,
        security,
        activity,
        packageAudit,
    };
}
