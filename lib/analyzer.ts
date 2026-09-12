import {
    FileTreeItem,
    AnalysisResult,
    ArchitectureBucket,
    RepoMeta,
} from "@/types/repo";
import { runSecurityScan } from "@/lib/securityScanner";
import { checkActivity } from "@/lib/activityChecker";

const EXCLUDE_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'vendor', 'target', '.venv', 'out']);
const CODE_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'swift', 'kt', 'vue', 'svelte']);
const FRONTEND_DIRS = new Set(['app', 'pages', 'components', 'views', 'ui', 'styles', 'client', 'frontend', 'web']);
const BACKEND_DIRS = new Set(['api', 'controllers', 'services', 'routes', 'server', 'handlers', 'middleware', 'backend']);
const DB_DIRS = new Set(['prisma', 'drizzle', 'migrations', 'models', 'schemas', 'sql', 'db', 'database', 'seeds']);
const INFRA_DIRS = new Set(['docker', 'k8s', 'kubernetes', 'terraform', 'deploy', '.aws', 'infra', 'ansible', 'helm']);
const TEST_DIRS = new Set(['__tests__', 'tests', 'test', 'spec', 'e2e', 'cypress', 'playwright']);
const CONFIG_DIRS = new Set(['config', 'configs', 'settings', '.vscode', '.husky', 'scripts', 'tools']);
const LOCKFILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'Cargo.lock', 'go.sum', 'Poetry.lock', 'composer.lock', 'bun.lockb']);
const TYPE_CONFIGS = new Set(['tsconfig.json', 'mypy.ini', '.flowconfig']);
const LINTER_CONFIGS = new Set(['.eslintrc', '.eslintrc.json', '.eslintrc.js', 'eslint.config.js', 'eslint.config.mjs', 'biome.json', '.prettierrc', '.prettierrc.json', '.prettierrc.js']);

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

const EXT_TO_LANG: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
    py: "Python", rb: "Ruby", go: "Go", rs: "Rust", java: "Java", cs: "C#", cpp: "C++", cc: "C++", c: "C", h: "C/C++",
    php: "PHP", swift: "Swift", kt: "Kotlin", dart: "Dart", vue: "Vue", svelte: "Svelte", html: "HTML", css: "CSS",
    scss: "SCSS", sass: "Sass", less: "Less", json: "JSON", yaml: "YAML", yml: "YAML", md: "Markdown", sh: "Shell",
    bash: "Shell", dockerfile: "Docker", tf: "Terraform",
};

function parsePackageJson(raw: string | null): { deps: string[]; devDeps: string[] } {
    if (!raw) return { deps: [], devDeps: [] };
    try {
        const pkg = JSON.parse(raw);
        return {
            deps: Object.keys(pkg.dependencies ?? {}),
            devDeps: Object.keys(pkg.devDependencies ?? {}),
        };
    } catch {
        return { deps: [], devDeps: [] };
    }
}

export function analyzeRepo(
    files: FileTreeItem[],
    readme: string | null,
    packageJson: string | null,
    truncated: boolean,
    meta?: RepoMeta
): AnalysisResult {
    let totalFiles = 0;
    let totalSize = 0;
    let maxDepth = 0;
    let codeFilesCount = 0;
    let testFilesCount = 0;

    const hasReadme = !!readme;
    const readmeLength = readme ? readme.length : 0;
    let hasLicense = false;
    let hasContributing = false;
    let hasChangelog = false;

    let hasGitIgnore = false;
    let hasLinter = false;
    let hasTypeConfig = false;
    let hasLockfile = false;
    let hasCiCd = false;
    let hasIaC = false;

    const topDirs = new Set<string>();
    const firstLevelPaths = new Set<string>();

    let hasCoverage = false;

    const archMap: Record<ArchitectureBucket["name"], string[]> = {
        Frontend: [], Backend: [], Database: [], "Infra/DevOps": [], Tests: [], Config: [], Other: []
    };
    const archCount: Record<ArchitectureBucket["name"], number> = {
        Frontend: 0, Backend: 0, Database: 0, "Infra/DevOps": 0, Tests: 0, Config: 0, Other: 0
    };

    const langCounts: Record<string, number> = {};
    const problems: string[] = [];
    const practices: string[] = [];

    for (const f of files) {
        if (f.type !== "blob") continue;
        const path = f.path;
        totalFiles++;
        if (f.size) totalSize += f.size;

        const parts = path.split("/");
        const depth = parts.length;
        if (depth > maxDepth) maxDepth = depth;

        if (depth >= 1) {
            topDirs.add(parts[0]);
            firstLevelPaths.add(parts[0]);
            if (depth >= 2) firstLevelPaths.add(`${parts[0]}/${parts[1]}`);
        }

        const baseName = parts[depth - 1];
        const lowerBase = baseName.toLowerCase();

        const firstSeg = parts[0];
        if (EXCLUDE_DIRS.has(firstSeg) && depth > 2) {
            continue; // Ignore deeply nested external/vendored folders for hot loop mapping
        }

        const extParts = lowerBase.split(".");
        const ext = extParts.length > 1 ? extParts[extParts.length - 1] : "";

        let isTest = false;

        if (CODE_EXTS.has(ext)) {
            codeFilesCount++;
        }

        if (path.includes(".test.") || path.includes(".spec.") || path.includes("__tests__/") || path.endsWith("_test.go")) {
            testFilesCount++;
            isTest = true;
        }

        if (path.startsWith("coverage/") || lowerBase === "lcov.info" || lowerBase === "clover.xml" || lowerBase.includes("cobertura")) {
            hasCoverage = true;
        }

        if (baseName === ".env" || baseName === ".env.local" || (baseName.startsWith(".env.") && !baseName.includes(".example") && !baseName.includes(".sample"))) {
            problems.push(`🔴 Kritik sır açığı şüphesi: ${path}`);
        }

        if (lowerBase === ".gitignore") hasGitIgnore = true;
        else if (LOCKFILES.has(lowerBase)) hasLockfile = true;
        else if (LINTER_CONFIGS.has(lowerBase)) hasLinter = true;
        else if (TYPE_CONFIGS.has(lowerBase)) hasTypeConfig = true;
        else if (lowerBase === "license" || lowerBase === "license.md" || lowerBase === "license.txt") hasLicense = true;
        else if (lowerBase === "contributing.md") hasContributing = true;
        else if (lowerBase.includes("changelog")) hasChangelog = true;

        if (lowerBase === "dockerfile" || lowerBase === "docker-compose.yml" || lowerBase === "docker-compose.yaml") hasIaC = true;
        if (path.includes(".github/workflows/")) hasCiCd = true;

        const langInfo = EXT_TO_LANG[ext] || EXT_TO_LANG[lowerBase];
        if (langInfo) {
            langCounts[langInfo] = (langCounts[langInfo] || 0) + 1;
        }

        const checkDir = parts[0] === "src" && depth > 1 ? parts[1] : parts[0];
        let bucket: ArchitectureBucket["name"] = "Other";

        if (isTest || TEST_DIRS.has(checkDir)) {
            bucket = "Tests";
        } else if (CONFIG_DIRS.has(checkDir) || LINTER_CONFIGS.has(lowerBase)) {
            bucket = "Config";
        } else if (FRONTEND_DIRS.has(checkDir)) {
            bucket = "Frontend";
        } else if (BACKEND_DIRS.has(checkDir)) {
            bucket = "Backend";
        } else if (DB_DIRS.has(checkDir)) {
            bucket = "Database";
        } else if (INFRA_DIRS.has(checkDir) || lowerBase.includes("docker") || path.includes(".github/workflows")) {
            bucket = "Infra/DevOps";
        }

        archCount[bucket]++;
        if (archMap[bucket].length < 8) {
            archMap[bucket].push(path);
        }
    }


    let testScore = Math.min(100, Math.round((testFilesCount / Math.max(1, codeFilesCount * 0.33)) * 100));
    if (hasCoverage) {
        testScore = Math.min(100, testScore + 20); // Bonus for having a robust setup
    }

    let docScore = 0;
    if (hasReadme) {
        docScore += 20;
        if (readmeLength > 1000) docScore += 15;
        if (readmeLength > 3000) docScore += 15;
    }
    if (hasLicense) docScore += 15;
    if (hasContributing) docScore += 20;
    if (hasChangelog) docScore += 15;
    docScore = Math.min(100, docScore);

    // Sıfır tabanlı healthScore: her kriter pozitif katkı sağlar
    let healthScore = 0;
    if (hasGitIgnore) healthScore += 15;  // .gitignore temel hijyeni
    if (hasLinter) healthScore += 15;     // kod standardı
    if (hasTypeConfig) healthScore += 15; // statik tipleme
    if (hasLockfile) healthScore += 15;   // deterministik bağımlılık
    if (hasCiCd) healthScore += 20;       // otomasyon
    if (hasIaC) healthScore += 10;        // konteyner/altyapı
    if (hasReadme) healthScore += 10;     // temel dokümantasyon

    if (problems.some(p => p.includes("Kritik sır"))) {
        healthScore = Math.max(0, healthScore - 40); // Kritik: .env sızıntısı
    }

    const maxNestingPenalty = maxDepth > 7 ? 10 : maxDepth > 6 ? 5 : 0;
    healthScore = Math.max(0, Math.min(100, healthScore - maxNestingPenalty));

    const overallScore = Math.round((testScore + docScore + healthScore) / 3);


    if (testScore > 50) practices.push("✅ Sağlıklı Test Kapsamı");
    if (hasCoverage) practices.push("✅ Test Coverage Raporu Bulundu (lcov/clover)");
    if (hasCiCd) practices.push("✅ CI/CD İş Akışı (GitHub Actions vb.)");
    if (hasTypeConfig) practices.push("✅ Statik Tipleme Mevcut");
    if (hasLockfile) practices.push("✅ Deterministik Bağımlılık Ağacı (Lockfile)");
    if (hasGitIgnore) practices.push("✅ İstenmeyen Dosya Engelleyici (.gitignore)");
    if (hasLicense) practices.push("✅ Açık Kaynak Lisansı Mevcut");
    if (hasIaC) practices.push("✅ Konteyner/Bulut Altyapı Dosyaları (IaC)");
    if (hasLinter) practices.push("✅ Kod Standardı Yapılandırması");

    if (testScore < 5) problems.push("🔴 Sistematik Test Zafiyeti (0'a yakın tespit)");
    if (!hasLicense) problems.push("🟡 Lisans Belgesi Eksik");
    if (maxDepth > 7) problems.push("🟡 Aşırı İç İçe Geçmiş Dizin Mimarisi (Gözden Geçirilmeli)");
    if (!hasCiCd) problems.push("🟡 Otomatize Edilmiş CI/CD Bulunamadı");
    if (topDirs.size <= 2 && totalFiles > 30) problems.push("🟡 Monolitik Katman Görünümü (Top-level klasörleşme yetersiz)");

    const totalLangFiles = Object.values(langCounts).reduce((a, b) => a + b, 0);
    const topLanguages = Object.entries(langCounts)
        .map(([lang, count]) => ({
            lang,
            count,
            percentage: Math.round((count / Math.max(1, totalLangFiles)) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    const { deps, devDeps } = parsePackageJson(packageJson);

    const architectureList = (["Frontend", "Backend", "Database", "Infra/DevOps", "Tests", "Config", "Other"] as ArchitectureBucket["name"][])
        .map(name => ({
            name,
            icon: ARCH_ICONS[name],
            color: ARCH_COLORS[name],
            paths: archMap[name],
            count: archCount[name],
        }))
        .filter(b => b.count > 0);

    const security = runSecurityScan(files);
    const activityInfo = meta
        ? checkActivity(meta.updatedAt, meta.createdAt)
        : checkActivity(new Date().toISOString(), new Date().toISOString());

    return {
        totalFiles,
        totalSize,
        architecture: architectureList,
        metrics: { testScore, docScore, healthScore, overall: overallScore },
        goodPractices: practices,
        potentialProblems: problems,
        topLanguages,
        directoryDepth: maxDepth,
        hasPackageJson: packageJson !== null,
        dependencies: deps,
        devDependencies: devDeps,
        readmeSummary: readme ? readme.slice(0, 1200) : "",
        firstLevelTree: Array.from(firstLevelPaths).slice(0, 40),
        truncated,
        security,
        activity: activityInfo,
        packageAudit: { hasPackageJson: false, findings: [] }, // Set via route.ts
        devopsAudit: { scanned: false, findings: [] }, // Set via route.ts
    };
}
