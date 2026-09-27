/**
 * lib/contentScanner.ts
 *
 * Gitleak-radar'ın gerçek SecretDetector ve DETECTION_RULES'unu kullanan içerik tarayıcısı.
 * gitleak-radar/detectors subpath üzerinden import edilir — v1.5.2+ gerektirir.
 *
 * ⚠️  SecretDetector node:crypto (allowlist hashing için) kullanır.
 *     Bu nedenle Next.js Edge Runtime yerine Node.js runtime'da çalıştırın.
 *     scan-content API rotası: runtime = "nodejs"
 */

import { SecretDetector, DETECTION_RULES } from "gitleak-radar/detectors";
import type { Finding } from "gitleak-radar/detectors";

export interface ContentFinding {
    path: string;
    line: number;
    column: number;
    ruleId: string;
    ruleName: string;
    severity: "low" | "medium" | "high" | "critical";
    maskedValue: string;
    secretHash?: string;
}

export interface ContentScanResult {
    findings: ContentFinding[];
    filesScanned: number;
    linesScanned: number;
}

/** Dosya başına maksimum karakter (~50 KB) */
const MAX_FILE_CHARS = 50_000;

function mapFinding(f: Finding): ContentFinding {
    return {
        path: f.file,
        line: f.line,
        column: f.column,
        ruleId: f.ruleId,
        ruleName: f.ruleName,
        severity: f.severity as ContentFinding["severity"],
        maskedValue: f.maskedValue,
        secretHash: f.secretHash,
    };
}

/**
 * Verilen dosya içeriklerini gitleak-radar SecretDetector ile satır satır tarar.
 * Gerçek paket kuralları + placeholder tespiti + entropy filtresi dahil.
 *
 * @param files  `{ path, content }` dizisi — content GitHub raw URL'den çekilmiş ham metin
 */
export function scanFileContents(
    files: { path: string; content: string }[]
): ContentScanResult {
    // Allowlist boş — gelecekte config'dan beslenebilir
    const detector = new SecretDetector(DETECTION_RULES, [], 2);
    const allFindings: ContentFinding[] = [];
    let linesScanned = 0;

    for (const { path, content } of files) {
        const truncated = content.slice(0, MAX_FILE_CHARS);
        const lines = truncated.split("\n");
        linesScanned += lines.length;

        for (let i = 0; i < lines.length; i++) {
            const lineNumber = i + 1;
            const previousLine = i > 0 ? lines[i - 1] : undefined;
            const lineFindings = detector.scanLine(
                lines[i],
                lineNumber,
                path,
                "low",
                previousLine
            );
            allFindings.push(...lineFindings.map(mapFinding));
        }
    }

    return {
        findings: allFindings,
        filesScanned: files.length,
        linesScanned,
    };
}
