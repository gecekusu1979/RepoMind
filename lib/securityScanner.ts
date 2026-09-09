import { FileTreeItem, SecurityFinding, SecurityRiskLevel, SecurityScanResult } from "@/types/repo";


interface RiskPattern {
    test: (path: string, lower: string) => boolean;
    severity: "low" | "critical";
    reason: string;
    recommendation: string;
}

const PATTERNS: RiskPattern[] = [
    {
        test: (_, l) => l.endsWith(".pem") || l.endsWith(".key") || l.endsWith(".pfx") || l.endsWith(".p12"),
        severity: "critical",
        reason: "Muhtemelen özel anahtar veya sertifika dosyası",
        recommendation: "Bu dosyayı derhal Git geçmişinden kaldırın (BFG Repo Cleaner veya git-filter-repo kullanın) ve tüm etkilenen kimlik bilgilerini yenileyin.",
    },
    {
        test: (_, l) => ["id_rsa", "id_ed25519", "id_dsa", "id_ecdsa"].some((k) => l.endsWith(k) || l.includes(`/${k}`)),
        severity: "critical",
        reason: "SSH özel anahtarı olabilir",
        recommendation: "SSH anahtarını hemen iptal edin, yeni bir çift oluşturun ve kayıt geçmişini temizleyin.",
    },
    {
        test: (_, l) =>
            l === ".env.production" || l === ".env.local" || l === ".env.staging" ||
            (l.startsWith(".env.") && !l.endsWith(".example") && !l.endsWith(".sample")),
        severity: "critical",
        reason: "Ortam değişkeni dosyası kaydedilmiş — gizli anahtarlar içerebilir",
        recommendation: ".gitignore'a ekleyin, git geçmişinden kaldırın ve tüm gizli anahtarları döndürün.",
    },
    {
        test: (_, l) => l === ".env" && !l.endsWith(".example"),
        severity: "critical",
        reason: ".env dosyası kaydedilmiş — üretim sırları riske girebilir",
        recommendation: ".gitignore'a '.env' ekleyin ve geçmişten temizleyin.",
    },
    {
        test: (_, l) => l === ".npmrc",
        severity: "low",
        reason: ".npmrc dosyası auth token içerebilir",
        recommendation: ".npmrc dosyasında _authToken veya _auth satırı olup olmadığını kontrol edin; varsa secrets yöneticisi kullanın.",
    },
    {
        test: (p) => p.includes(".aws/credentials") || p.includes(".aws/config"),
        severity: "critical",
        reason: "AWS kimlik dosyası kaydedilmiş",
        recommendation: "AWS kimlik bilgilerini derhal geçersiz kılın ve IAM rolü veya secrets manager kullanın.",
    },
    {
        test: (_, l) => l.endsWith(".sql") || l.endsWith(".dump"),
        severity: "low",
        reason: "Veritabanı dump dosyası bulundu",
        recommendation: "Dump dosyalarının gerçek veri içermediğini doğrulayın; içeriyorsa kaldırın ve .gitignore'a ekleyin.",
    },
    {
        test: (_, l) => l.endsWith(".sqlite") || l.endsWith(".db") || l.endsWith(".sqlite3"),
        severity: "low",
        reason: "SQLite/veritabanı dosyası kaydedilmiş",
        recommendation: "İkili veritabanı dosyaları .gitignore'a eklenmelidir. Git LFS veya migration kullanmayı göz önünde bulundurun.",
    },
    {
        test: (_, l) => l.endsWith(".keystore") || l.endsWith(".jks"),
        severity: "critical",
        reason: "Java keystore dosyası kaydedilmiş",
        recommendation: "Keystore dosyasını kaldırın ve içerdiği sertifikaları yenileyin.",
    },
    {
        test: (_, l) => l.endsWith(".wallet") || l.endsWith(".dat"),
        severity: "low",
        reason: "Cüzdan veya ikili veri dosyası kaydedilmiş",
        recommendation: "Bu dosyanın hassas veri içermediğini doğrulayın.",
    },
    {
        test: (_, l) => l === "docker-compose.override.yml",
        severity: "low",
        reason: "Docker compose override dosyası kaydedilmiş — gizli servis parolaları içerebilir",
        recommendation: "docker-compose.override.yml dosyasını .gitignore'a ekleyin.",
    },
];


export function runSecurityScan(files: FileTreeItem[]): SecurityScanResult {
    const findings: SecurityFinding[] = [];

    for (const file of files) {
        if (file.type !== "blob") continue;
        const lower = file.path.toLowerCase();
        const filename = lower.split("/").pop() ?? lower;

        for (const pattern of PATTERNS) {
            if (pattern.test(file.path, filename)) {
                findings.push({
                    path: file.path,
                    severity: pattern.severity,
                    reason: pattern.reason,
                    recommendation: pattern.recommendation,
                });
                break; // Only match one pattern per file
            }
        }
    }

    const unique = findings.filter(
        (f, i, arr) => arr.findIndex((x) => x.path === f.path) === i
    );

    const hasCritical = unique.some((f) => f.severity === "critical");
    const hasLow = unique.some((f) => f.severity === "low");

    const riskLevel: SecurityRiskLevel = hasCritical
        ? "Critical"
        : hasLow
            ? "Low"
            : "Clean";

    return { riskLevel, findings: unique };
}
