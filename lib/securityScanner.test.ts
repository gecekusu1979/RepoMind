import { describe, it, expect } from "vitest";
import { runSecurityScan } from "./securityScanner";
import type { FileTreeItem } from "@/types/repo";

function blob(path: string, size = 100): FileTreeItem {
    return { path, type: "blob", size };
}

describe("runSecurityScan — dosya adı/yol eşleştirmesi", () => {
    it("temiz dosya listesinde Clean döner", () => {
        const result = runSecurityScan([blob("src/index.ts"), blob("README.md")]);
        expect(result.riskLevel).toBe("Clean");
        expect(result.findings).toHaveLength(0);
    });

    it(".pem dosyasını critical olarak işaretler", () => {
        const result = runSecurityScan([blob("certs/server.pem")]);
        expect(result.riskLevel).toBe("Critical");
        expect(result.findings[0].severity).toBe("critical");
        expect(result.findings[0].path).toBe("certs/server.pem");
    });

    it("id_rsa dosyasını critical olarak işaretler", () => {
        const result = runSecurityScan([blob("keys/id_rsa")]);
        expect(result.riskLevel).toBe("Critical");
    });

    it(".env.production dosyasını critical olarak işaretler", () => {
        const result = runSecurityScan([blob(".env.production")]);
        expect(result.riskLevel).toBe("Critical");
    });

    it(".env.example dosyasını görmezden gelir (örnek dosya)", () => {
        const result = runSecurityScan([blob(".env.example")]);
        expect(result.riskLevel).toBe("Clean");
    });

    it(".env.sample dosyasını görmezden gelir", () => {
        const result = runSecurityScan([blob(".env.sample")]);
        expect(result.riskLevel).toBe("Clean");
    });

    it(".npmrc dosyasını low risk olarak işaretler", () => {
        const result = runSecurityScan([blob(".npmrc")]);
        expect(result.riskLevel).toBe("Low");
        expect(result.findings[0].severity).toBe("low");
    });

    it(".aws/credentials dosyasını critical olarak işaretler", () => {
        const result = runSecurityScan([blob(".aws/credentials")]);
        expect(result.riskLevel).toBe("Critical");
    });

    it("aynı dosyaya birden fazla bulgu eklemez (dedupe)", () => {
        // .env.production hem .env pattern hem production pattern ile eşleşebilir
        const result = runSecurityScan([blob(".env.production")]);
        const paths = result.findings.map((f) => f.path);
        const unique = new Set(paths);
        expect(unique.size).toBe(paths.length);
    });

    it("sadece critical varsa Critical, sadece low varsa Low döner", () => {
        const mixed = runSecurityScan([blob(".npmrc"), blob(".aws/credentials")]);
        expect(mixed.riskLevel).toBe("Critical");

        const lowOnly = runSecurityScan([blob(".npmrc")]);
        expect(lowOnly.riskLevel).toBe("Low");
    });

    it("tree içindeki blob olmayan öğeleri (tree node) atlar", () => {
        const items: FileTreeItem[] = [
            { path: "src", type: "tree" },
            blob("src/index.ts"),
        ];
        const result = runSecurityScan(items);
        expect(result.riskLevel).toBe("Clean");
    });
});
