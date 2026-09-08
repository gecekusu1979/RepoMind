import { PackageAuditResult, PackageAuditFinding, PackageRiskSeverity } from "@/types/repo";

const DEPRECATED_PACKAGES: Record<string, { recommended: string; severity: PackageRiskSeverity }> = {
    "request": { recommended: "fetch / axios", severity: "high" },
    "moment": { recommended: "date-fns / dayjs", severity: "high" },
    "node-sass": { recommended: "sass / tailwindcss", severity: "high" },
    "tslint": { recommended: "eslint + @typescript-eslint", severity: "high" },
    "body-parser": { recommended: "express.json()", severity: "medium" },
    "enzyme": { recommended: "@testing-library/react", severity: "high" },
    "faker": { recommended: "@faker-js/faker", severity: "high" },
    "babel-preset-es2015": { recommended: "@babel/preset-env", severity: "medium" },
    "core-js": { recommended: "Consider dropping if targeting modern runtimes", severity: "medium" },
    "uuid": { recommended: "crypto.randomUUID() (for modern runtimes)", severity: "medium" },
};

const VIRAL_LICENSES = ["gpl", "agpl", "lgpl"];

export function auditPackages(packageJsonString: string | null): PackageAuditResult {
    if (!packageJsonString) {
        return { hasPackageJson: false, findings: [] };
    }

    try {
        const pkg = JSON.parse(packageJsonString);
        const findings: PackageAuditFinding[] = [];

        const deps = Object.keys(pkg.dependencies || {});
        const devDeps = Object.keys(pkg.devDependencies || {});
        const scripts = pkg.scripts || {};
        const allDeps = [...deps, ...devDeps];

        // 1. Deprecated Packages Check
        for (const dep of allDeps) {
            const deprecation = DEPRECATED_PACKAGES[dep];
            if (deprecation) {
                findings.push({
                    name: dep,
                    severity: deprecation.severity,
                    reason: `Kullanımdan kaldırılmış (deprecated) veya eski paket.`,
                    recommendation: deprecation.recommended,
                });
            }
        }

        // 2. Dangerous Scripts Check
        const dangerousPatterns = [/curl\s+/, /wget\s+/, /bash\s+-c/, /rm\s+-rf\s+\//];
        for (const [scriptName, scriptContent] of Object.entries(scripts)) {
            if (typeof scriptContent !== "string") continue;

            // Only flag postinstall or preinstall if they do sketchy stuff
            // Or if any script does sketchy dynamic eval stuff
            if (dangerousPatterns.some(regex => regex.test(scriptContent))) {
                findings.push({
                    name: `script:${scriptName}`,
                    severity: "high",
                    reason: `Tehlikeli olabilecek komut tespit edildi: ${scriptContent.substring(0, 30)}...`,
                    recommendation: "Betiğin ne indirdiğini veya çalıştırdığını kontrol edin.",
                });
            }
        }

        // 3. License Field Viral Check (just checking the actual package's license field for now)
        if (typeof pkg.license === "string" && VIRAL_LICENSES.some(v => pkg.license.toLowerCase().includes(v))) {
            findings.push({
                name: "license",
                severity: "medium",
                reason: `Viral/Copyleft lisans tespit edildi (${pkg.license}).`,
                recommendation: "Ticari kullanım kısıtlamalarını gözden geçirin (GPL/AGPL varyantı).",
            });
        }

        return { hasPackageJson: true, findings };
    } catch {
        return { hasPackageJson: false, findings: [] };
    }
}
