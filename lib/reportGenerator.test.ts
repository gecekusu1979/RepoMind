import { describe, it, expect } from "vitest";
import { buildAuditMarkdown } from "./reportGenerator";
import type { AnalyzeResponse } from "@/types/repo";

function makeResponse(overrides: Partial<AnalyzeResponse["analysis"]> = {}): AnalyzeResponse {
    return {
        meta: {
            owner: "gecekusu1979",
            name: "RepoMind",
            fullName: "gecekusu1979/RepoMind",
            url: "https://github.com/gecekusu1979/RepoMind",
            description: "Test depo",
            stars: 42,
            forks: 5,
            watchers: 10,
            openIssues: 3,
            language: "TypeScript",
            license: "GPL-3.0",
            topics: ["nextjs", "ai"],
            defaultBranch: "main",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-06-01T00:00:00Z",
            size: 1234,
            homepage: null,
        },
        analysis: {
            totalFiles: 50,
            totalSize: 500_000,
            architecture: [
                { name: "Frontend", icon: "🎨", color: "#6366f1", paths: ["components/Button.tsx"], count: 1 },
            ],
            metrics: { testScore: 75, docScore: 80, healthScore: 90, overall: 82 },
            goodPractices: ["✅ CI/CD"],
            potentialProblems: [],
            topLanguages: [{ lang: "TypeScript", count: 30, percentage: 80 }],
            directoryDepth: 4,
            hasPackageJson: true,
            dependencies: ["react", "next"],
            devDependencies: ["typescript"],
            readmeSummary: "RepoMind açıklaması",
            firstLevelTree: ["src", "components"],
            truncated: false,
            security: { riskLevel: "Clean", findings: [] },
            activity: { status: "Aktif Geliştirme" as const, activityScore: 80, daysSinceUpdate: 10, color: "green", emoji: "🟢" },
            packageAudit: { hasPackageJson: true, findings: [] },
            devopsAudit: { scanned: false, findings: [] },
            ...overrides,
        },
    };
}

describe("buildAuditMarkdown", () => {
    it("repo adını başlıkta içerir", () => {
        const md = buildAuditMarkdown(makeResponse());
        expect(md).toContain("gecekusu1979/RepoMind");
    });

    it("genel skoru içerir", () => {
        const md = buildAuditMarkdown(makeResponse());
        expect(md).toContain("82/100");
    });

    it("Clean güvenlik durumunu doğru gösterir", () => {
        const md = buildAuditMarkdown(makeResponse());
        expect(md).toContain("Clean");
    });

    it("kritik güvenlik bulgusu varsa path'i içerir", () => {
        const md = buildAuditMarkdown(makeResponse({
            security: {
                riskLevel: "Critical",
                findings: [
                    { path: "secrets/id_rsa", severity: "critical", reason: "SSH key", recommendation: "Sil." }
                ]
            }
        }));
        expect(md).toContain("secrets/id_rsa");
    });

    it("deprecated paket bulgusu varsa paketi listeler", () => {
        const md = buildAuditMarkdown(makeResponse({
            packageAudit: {
                hasPackageJson: true,
                findings: [{ name: "moment", severity: "high", reason: "Deprecated", recommendation: "dayjs kullan" }]
            }
        }));
        expect(md).toContain("moment");
    });

    it("potentialProblems listesini içerir", () => {
        const md = buildAuditMarkdown(makeResponse({
            potentialProblems: ["🔴 Kritik sır açığı şüphesi: .env.production"]
        }));
        expect(md).toContain(".env.production");
    });

    it("devopsAudit scanned:false ise DevOps bölümü yok", () => {
        const md = buildAuditMarkdown(makeResponse());
        expect(md).not.toContain("DevOps & CI/CD Denetimi");
    });

    it("devopsAudit scanned:true ise DevOps bölümü var", () => {
        const md = buildAuditMarkdown(makeResponse({
            devopsAudit: {
                scanned: true,
                findings: [{
                    file: "Dockerfile", rule: "D1_LATEST_TAG", severity: "critical",
                    message: "latest tag", remediation: "Pin version"
                }]
            }
        }));
        expect(md).toContain("DevOps");
        expect(md).toContain("D1_LATEST_TAG");
    });

    it("string döner (join kontrolü)", () => {
        const md = buildAuditMarkdown(makeResponse());
        expect(typeof md).toBe("string");
        expect(md.length).toBeGreaterThan(100);
    });
});
