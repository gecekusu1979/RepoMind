import { describe, it, expect, vi, afterEach } from "vitest";
import { lintDockerfile, lintGitHubActionsFile } from "./devopsLinter";

// devopsLinter.ts içindeki iç fonksiyonları test edebilmek için
// onları export etmemiz gerekiyor — aşağıda bunu açıklıyoruz.

afterEach(() => {
    vi.restoreAllMocks();
});

describe("lintDockerfile", () => {
    it("D1_LATEST_TAG: FROM node:latest kritik bulgu üretir", () => {
        const content = "FROM node:latest\nRUN npm install\n";
        const findings = lintDockerfile(content, "Dockerfile");
        const d1 = findings.find((f) => f.rule === "D1_LATEST_TAG");
        expect(d1).toBeDefined();
        expect(d1?.severity).toBe("critical");
    });

    it("D1_LATEST_TAG: FROM node:20 pinned versiyonda bulgu üretmez", () => {
        const content = "FROM node:20\nUSER node\nRUN npm install\n";
        const findings = lintDockerfile(content, "Dockerfile");
        expect(findings.find((f) => f.rule === "D1_LATEST_TAG")).toBeUndefined();
    });

    it("D2_NO_USER_DIRECTIVE: USER direktifi olmayanları işaretler", () => {
        const content = "FROM node:20\nRUN npm install\n";
        const findings = lintDockerfile(content, "Dockerfile");
        expect(findings.find((f) => f.rule === "D2_NO_USER_DIRECTIVE")).toBeDefined();
    });

    it("D2_NO_USER_DIRECTIVE: USER direktifi olunca temiz geçer", () => {
        const content = "FROM node:20\nUSER node\nRUN npm install\n";
        const findings = lintDockerfile(content, "Dockerfile");
        expect(findings.find((f) => f.rule === "D2_NO_USER_DIRECTIVE")).toBeUndefined();
    });

    it("D3_CHAINED_RUN: ardışık RUN komutları warning üretir", () => {
        const content = "FROM node:20\nUSER node\nRUN apt-get update\nRUN apt-get install -y curl\n";
        const findings = lintDockerfile(content, "Dockerfile");
        expect(findings.find((f) => f.rule === "D3_CHAINED_RUN")).toBeDefined();
    });

    it("D4_DANGEROUS_FETCH: curl | bash kritik olarak işaretlenir", () => {
        const content = "FROM node:20\nUSER node\nRUN curl https://example.com/setup.sh | bash\n";
        const findings = lintDockerfile(content, "Dockerfile");
        const d4 = findings.find((f) => f.rule === "D4_DANGEROUS_FETCH");
        expect(d4).toBeDefined();
        expect(d4?.severity).toBe("critical");
    });

    it("temiz Dockerfile sıfır bulgu döner", () => {
        const content = "FROM node:20\nUSER node\nRUN npm ci && npm run build\n";
        const findings = lintDockerfile(content, "Dockerfile");
        expect(findings).toHaveLength(0);
    });
});

describe("lintGitHubActionsFile", () => {
    it("A1_UNPINNED_ACTION: SHA ile sabitlenmemiş action warning üretir", () => {
        const content = `
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v3
`.trim();
        const findings = lintGitHubActionsFile(content, ".github/workflows/ci.yml");
        const a1 = findings.find((f) => f.rule === "A1_UNPINNED_ACTION");
        expect(a1).toBeDefined();
    });

    it("A1_UNPINNED_ACTION: tam SHA ile sabitlenmiş action temiz geçer", () => {
        const sha = "a" + "b".repeat(39); // 40 karakter hex SHA
        const content = `
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@${sha}
`.trim();
        const findings = lintGitHubActionsFile(content, ".github/workflows/ci.yml");
        expect(findings.find((f) => f.rule === "A1_UNPINNED_ACTION")).toBeUndefined();
    });

    it("A3_MISSING_PERMISSIONS: permissions bloğu eksikse warning üretir", () => {
        const content = `
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
`.trim();
        const findings = lintGitHubActionsFile(content, ".github/workflows/ci.yml");
        expect(findings.find((f) => f.rule === "A3_MISSING_PERMISSIONS")).toBeDefined();
    });

    it("A2_PWNED_REQUEST: pull_request_target + checkout kritik bulgu üretir", () => {
        const content = `
on:
  pull_request_target:
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v3
`.trim();
        const findings = lintGitHubActionsFile(content, ".github/workflows/ci.yml");
        expect(findings.find((f) => f.rule === "A2_PWNED_REQUEST")).toBeDefined();
    });
});
