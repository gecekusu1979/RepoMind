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

export async function auditPackages(packageJsonString: string | null): Promise<PackageAuditResult> {
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

        const dangerousPatterns = [/curl\s+/, /wget\s+/, /bash\s+-c/, /rm\s+-rf\s+\//];
        for (const [scriptName, scriptContent] of Object.entries(scripts)) {
            if (typeof scriptContent !== "string") continue;
            if (dangerousPatterns.some(regex => regex.test(scriptContent))) {
                findings.push({
                    name: `script:${scriptName}`,
                    severity: "high",
                    reason: `Tehlikeli olabilecek komut tespit edildi: ${scriptContent.substring(0, 30)}...`,
                    recommendation: "Betiğin ne indirdiğini veya çalıştırdığını kontrol edin.",
                });
            }
        }

        if (typeof pkg.license === "string" && VIRAL_LICENSES.some(v => pkg.license.toLowerCase().includes(v))) {
            findings.push({
                name: "license",
                severity: "medium",
                reason: `Viral/Copyleft lisans tespit edildi (${pkg.license}).`,
                recommendation: "Ticari kullanım kısıtlamalarını gözden geçirin (GPL/AGPL varyantı).",
            });
        }

        try {
            const allDepEntries = { ...pkg.dependencies, ...pkg.devDependencies };
            const payload: Record<string, string[]> = {};

            for (const [dep, versionReq] of Object.entries(allDepEntries)) {
                if (typeof versionReq === "string") {
                    const cleanVersion = versionReq.replace(/[\^~><=]/g, '').trim();
                    if (/^\d+\.\d+\.\d+/.test(cleanVersion)) {
                        payload[dep] = [cleanVersion];
                    }
                }
            }

            if (Object.keys(payload).length > 0) {
                const res = await fetch("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json() as Record<string, { severity?: string; title?: string; url?: string }[]>;
                    for (const [dep, advisories] of Object.entries(data)) {
                        if (Array.isArray(advisories) && advisories.length > 0) {
                            const advisory = advisories[0];
                            const rawSeverity = (advisory.severity || "medium").toLowerCase();
                            const mappedSeverity: PackageRiskSeverity = ["critical", "high"].includes(rawSeverity)
                                ? "high"
                                : "medium";

                            findings.push({
                                name: dep,
                                severity: mappedSeverity,
                                reason: `Güvenlik açığı tespit edildi (CVE): ${advisory.title || "Bilinmiyor"} (kullanılan versiyon: ${payload[dep][0]})`,
                                recommendation: `Paketi daha yeni bir versiyona güncelleyin: ${advisory.url || "NPM Audit"} üzerinden inceleyin.`,
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.error("NPM audit request failed", e);
        }

        return { hasPackageJson: true, findings };
    } catch {
        return { hasPackageJson: false, findings: [] };
    }
}
