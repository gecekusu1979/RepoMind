import { describe, it, expect } from "vitest";
import { isValidGitHubSlug, parseGitHubUrl } from "./github";

describe("isValidGitHubSlug", () => {
    it("kabul eder: harf, rakam, tire ve alt çizgi içeren geçerli slug'ları", () => {
        expect(isValidGitHubSlug("gecekusu1979")).toBe(true);
        expect(isValidGitHubSlug("Repo-Mind_2")).toBe(true);
    });

    it("reddeder: path traversal ve boş/özel segmentleri", () => {
        expect(isValidGitHubSlug("..")).toBe(false);
        expect(isValidGitHubSlug(".")).toBe(false);
        expect(isValidGitHubSlug("")).toBe(false);
    });

    it("reddeder: slash, protokol ayırıcı veya boşluk içeren değerleri", () => {
        expect(isValidGitHubSlug("owner/repo")).toBe(false);
        expect(isValidGitHubSlug("evil.com:8080")).toBe(false);
        expect(isValidGitHubSlug("owner repo")).toBe(false);
        expect(isValidGitHubSlug("../../etc")).toBe(false);
    });
});

describe("parseGitHubUrl", () => {
    it("tam GitHub URL'sini owner/repo olarak ayrıştırır", () => {
        expect(parseGitHubUrl("https://github.com/gecekusu1979/RepoMind")).toEqual({
            owner: "gecekusu1979",
            repo: "RepoMind",
        });
    });

    it(".git uzantısını temizler", () => {
        expect(parseGitHubUrl("https://github.com/gecekusu1979/RepoMind.git")).toEqual({
            owner: "gecekusu1979",
            repo: "RepoMind",
        });
    });

    it("kısa owner/repo formatını kabul eder", () => {
        expect(parseGitHubUrl("gecekusu1979/RepoMind")).toEqual({
            owner: "gecekusu1979",
            repo: "RepoMind",
        });
    });

    it("geçersiz owner/repo segmentlerinde hata fırlatır (SSRF/traversal koruması)", () => {
        expect(() => parseGitHubUrl("https://github.com/../RepoMind")).toThrow();
        expect(() => parseGitHubUrl("../../etc/passwd")).toThrow();
    });

    it("hiç eşleşmeyen girişte hata fırlatır", () => {
        expect(() => parseGitHubUrl("not a url at all")).toThrow();
    });
});
