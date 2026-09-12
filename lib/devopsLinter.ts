/**
 * lib/devopsLinter.ts
 * Static analysis linter for Docker and GitHub Actions configuration files.
 * Implements 7 rules across Docker anti-patterns and CI/CD security misconfigurations.
 * Compatible with Edge Runtime (no Node.js-only APIs).
 */

import { DevOpsFinding, DevOpsAuditResult } from "@/types/repo";
import { FileTreeItem, ParsedRepoUrl } from "@/types/repo";
import { fetchRawFile } from "@/lib/gitProvider";


function lintDockerfile(content: string, filePath: string): DevOpsFinding[] {
    const findings: DevOpsFinding[] = [];
    const lines = content.split("\n");

    let hasUserDirective = false;
    let consecutiveRunCount = 0;
    let lastRunLine = -1;

    lines.forEach((raw, idx) => {
        const line = raw.trim();
        const lineNum = idx + 1;

        if (!line || line.startsWith("#")) {
            consecutiveRunCount = 0;
            return;
        }

        if (/^FROM\s+/i.test(line) && /:latest\s*$/i.test(line)) {
            findings.push({
                file: filePath,
                line: lineNum,
                rule: "D1_LATEST_TAG",
                severity: "critical",
                message: "`FROM` ifadesinde `:latest` etiketi kullanılıyor; imaj versiyonu belirsiz.",
                remediation:
                    "Sabit bir versiyon (`FROM node:20.11.0`) ya da SHA digest (`FROM node@sha256:...`) kullanın.",
            });
        }

        if (/^USER\s+/i.test(line)) {
            hasUserDirective = true;
        }

        if (/^RUN\s+/i.test(line)) {
            if (lastRunLine === lineNum - 1 || (lastRunLine !== -1 && lineNum - lastRunLine <= 2)) {
                consecutiveRunCount++;
                if (consecutiveRunCount >= 2) {
                    findings.push({
                        file: filePath,
                        line: lineNum,
                        rule: "D3_CHAINED_RUN",
                        severity: "warning",
                        message:
                            "Ardışık `RUN` satırları her biri ayrı bir katman oluşturur, imaj boyutunu şişirir.",
                        remediation:
                            "`RUN` komutlarını `&&` ile birleştirin ya da multi-stage build kullanın.",
                    });
                    consecutiveRunCount = 0;
                }
            } else {
                consecutiveRunCount = 1;
            }
            lastRunLine = lineNum;
        } else if (!/^#/.test(line) && line !== "") {
            consecutiveRunCount = 0;
        }

        if (
            /curl\s+.*\|\s*(bash|sh)/i.test(line) ||
            /wget\s+.*\|\s*(bash|sh)/i.test(line) ||
            /\|\s*(bash|sh)\s*$/i.test(line)
        ) {
            findings.push({
                file: filePath,
                line: lineNum,
                rule: "D4_DANGEROUS_FETCH",
                severity: "critical",
                message:
                    "`curl | bash` veya `wget | sh` kullanımı; ağ kaynağından rastgele kod çalıştırılıyor.",
                remediation:
                    "İndirilen dosyayı önce kaydedin, checksum doğrulaması yapın, ardından çalıştırın.",
            });
        }
    });

    if (!hasUserDirective) {
        findings.push({
            file: filePath,
            rule: "D2_NO_USER_DIRECTIVE",
            severity: "critical",
            message:
                "Dockerfile'da `USER` direktifi yok; konteyner muhtemelen root olarak çalışıyor.",
            remediation:
                "Son aşamaya `USER nonroot` veya özel bir kullanıcı direktifi ekleyin. Örn: `RUN adduser --disabled-password app && USER app`",
        });
    }

    return findings;
}


function lintGitHubActionsFile(content: string, filePath: string): DevOpsFinding[] {
    const findings: DevOpsFinding[] = [];
    const lines = content.split("\n");

    let hasPRTarget = false;
    let hasCheckoutAfterPRTarget = false;
    let hasPermissions = false;

    lines.forEach((raw, idx) => {
        const line = raw.trim();
        const lineNum = idx + 1;

        if (!line || line.startsWith("#")) return;

        const usesMatch = line.match(/^\s*uses:\s*([^@\s]+)@([^\s]+)/);
        if (usesMatch) {
            const actionRef = usesMatch[2];
            const isSHA = /^[0-9a-f]{40}$/i.test(actionRef);
            const isOfficialSemver = /^v\d+\.\d+\.\d+$/.test(actionRef);
            if (!isSHA && !isOfficialSemver) {
                findings.push({
                    file: filePath,
                    line: lineNum,
                    rule: "A1_UNPINNED_ACTION",
                    severity: "warning",
                    message: `Üçüncü taraf action \`${usesMatch[1]}@${actionRef}\` sabit bir commit SHA'sına sabitlenmemiş.`,
                    remediation: `Aksiyon referansını commit SHA ile sabitleyin. Örn: \`${usesMatch[1]}@abc1234...\``,
                });
            }
        }

        if (/pull_request_target/.test(line)) {
            hasPRTarget = true;
        }

        if (/actions\/checkout/.test(line) && hasPRTarget) {
            hasCheckoutAfterPRTarget = true;
        }

        if (/^\s*permissions\s*:/i.test(line)) {
            hasPermissions = true;
        }
    });

    if (hasPRTarget && hasCheckoutAfterPRTarget) {
        findings.push({
            file: filePath,
            rule: "A2_PWNED_REQUEST",
            severity: "critical",
            message:
                "`pull_request_target` tetikleyicisi ile `actions/checkout` birlikte kullanılıyor; pwn-request saldırısına açık.",
            remediation:
                "`pull_request_target` kullanıyorsanız asla fork'un kodunu checkout etmeyin veya `if: github.event.pull_request.head.repo.full_name == github.repository` koşulunu ekleyin.",
        });
    }

    if (!hasPermissions) {
        findings.push({
            file: filePath,
            rule: "A3_MISSING_PERMISSIONS",
            severity: "warning",
            message:
                "İş akışında açık `permissions:` bloğu tanımlanmamış; varsayılan izinler fazla geniş olabilir.",
            remediation:
                'İş akışına `permissions: read-all` veya ihtiyaç duyulan minimum izinleri ekleyin:\n```yaml\npermissions:\n  contents: read\n```',
        });
    }

    return findings;
}


export async function runDevopsLinter(
    parsed: ParsedRepoUrl,
    branch: string,
    tree: FileTreeItem[]
): Promise<DevOpsAuditResult> {
    const pathSet = tree
        .filter((f) => !f.path.includes("node_modules/") && !f.path.includes("vendor/") && !f.path.includes("dist/"))
        .map((f) => f.path);

    const dockerfiles = pathSet.filter(
        (p) => /^(.*\/)?dockerfile$/i.test(p) || /^(.*\/)?docker-compose\.ya?ml$/i.test(p)
    );
    const actionFiles = pathSet.filter((p) =>
        /^\.github\/workflows\/.+\.ya?ml$/i.test(p)
    );

    const targets = [...dockerfiles, ...actionFiles].slice(0, 10);
    if (targets.length === 0) {
        return { scanned: false, findings: [] };
    }

    const allFindings: DevOpsFinding[] = [];

    await Promise.all(
        targets.map(async (path) => {
            const content = await fetchRawFile(parsed, path, branch);
            if (!content) return;

            const isDocker =
                /^(.*\/)?dockerfile$/i.test(path) || /docker-compose/i.test(path);
            const fileFindings = isDocker
                ? lintDockerfile(content, path)
                : lintGitHubActionsFile(content, path);

            allFindings.push(...fileFindings);
        })
    );

    return { scanned: true, findings: allFindings };
}
