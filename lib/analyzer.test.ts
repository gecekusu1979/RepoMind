import { describe, it, expect } from "vitest";
import { analyzeRepo } from "./analyzer";
import type { FileTreeItem } from "@/types/repo";

function blob(path: string, size = 200): FileTreeItem {
    return { path, type: "blob", size };
}

const MINIMAL_FILES: FileTreeItem[] = [
    blob(".gitignore"),
    blob("tsconfig.json"),
    blob("eslint.config.mjs"),
    blob("package-lock.json"),
    blob(".github/workflows/ci.yml"),
    blob("src/index.ts"),
    blob("README.md"),
];

describe("analyzeRepo — temel metrikler", () => {
    it("boş dosya listesinde 0 dosya ve Clean security döner", () => {
        const result = analyzeRepo([], null, null, false);
        expect(result.totalFiles).toBe(0);
        expect(result.security.riskLevel).toBe("Clean");
    });

    it("sağlıklı yapıda healthScore > 0 döner", () => {
        const result = analyzeRepo(MINIMAL_FILES, "# README", null, false);
        expect(result.metrics.healthScore).toBeGreaterThan(0);
    });

    it(".gitignore, tsconfig, lockfile, linter, CI varsa healthScore > 60", () => {
        const result = analyzeRepo(MINIMAL_FILES, "# README\n" + "x".repeat(2000), null, false);
        expect(result.metrics.healthScore).toBeGreaterThanOrEqual(60);
    });

    it("test dosyaları testScore'u yükseltir", () => {
        const withTests = [
            ...MINIMAL_FILES,
            blob("src/__tests__/index.test.ts"),
            blob("src/utils.test.ts"),
        ];
        const withoutTests = [...MINIMAL_FILES];
        const r1 = analyzeRepo(withTests, "# Readme", null, false);
        const r2 = analyzeRepo(withoutTests, "# Readme", null, false);
        expect(r1.metrics.testScore).toBeGreaterThanOrEqual(r2.metrics.testScore);
    });

    it(".env.production dosyası potentialProblems'a kritik uyarı ekler", () => {
        const files = [...MINIMAL_FILES, blob(".env.production")];
        const result = analyzeRepo(files, null, null, false);
        expect(result.potentialProblems.some((p) => p.includes("Kritik sır"))).toBe(true);
    });

    it("node_modules içindeki dosyalar archMap'e dahil edilmez (derin nesting)", () => {
        const files = [
            ...MINIMAL_FILES,
            blob("node_modules/lodash/lodash.js"),
            blob("node_modules/lodash/fp.js"),
            blob("node_modules/lodash/chunk.js"),
        ];
        const result = analyzeRepo(files, null, null, false);
        // node_modules derin dosyaları exclude edildiğinde toplam sayı yine de artar
        // ama architecture bucket'ları etkilenmemeli
        const otherBucket = result.architecture.find((b) => b.name === "Other");
        // node_modules dosyaları "Other" bucket'ına düşmemeli (exclude edilir)
        if (otherBucket) {
            expect(otherBucket.paths.every((p) => !p.includes("node_modules"))).toBe(true);
        }
    });

    it("Frontend klasöründeki dosyaları Frontend bucket'ına atar", () => {
        const files = [
            blob("components/Button.tsx"),
            blob("components/Header.tsx"),
            blob("app/page.tsx"),
        ];
        const result = analyzeRepo(files, null, null, false);
        const frontend = result.architecture.find((b) => b.name === "Frontend");
        expect(frontend).toBeDefined();
        expect(frontend!.count).toBeGreaterThan(0);
    });

    it("package.json'dan bağımlılıkları ayrıştırır", () => {
        const pkg = JSON.stringify({
            dependencies: { react: "^19", next: "^16" },
            devDependencies: { typescript: "^5" },
        });
        const result = analyzeRepo(MINIMAL_FILES, null, pkg, false, undefined);
        expect(result.dependencies).toContain("react");
        expect(result.devDependencies).toContain("typescript");
    });

    it("truncated bayrak doğru aktarılır", () => {
        const result = analyzeRepo([], null, null, true);
        expect(result.truncated).toBe(true);
    });
});

describe("analyzeRepo — topLanguages", () => {
    it("TypeScript dosyaları topLanguages'de görünür", () => {
        const files = [blob("a.ts"), blob("b.ts"), blob("c.tsx"), blob("d.py")];
        const result = analyzeRepo(files, null, null, false);
        const ts = result.topLanguages.find((l) => l.lang === "TypeScript");
        expect(ts).toBeDefined();
        expect(ts!.count).toBeGreaterThanOrEqual(3);
    });
});
