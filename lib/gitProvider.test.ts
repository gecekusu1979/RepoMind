import { describe, it, expect } from "vitest";
import { isValidGitHubSlug, parseRepoUrl } from "./gitProvider";

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

describe("parseRepoUrl", () => {
    it("tam GitHub URL'sini owner/repo olarak ayrıştırır", () => {
        expect(parseRepoUrl("https://github.com/gecekusu1979/RepoMind")).toEqual({
            provider: "github",
            owner: "gecekusu1979",
            repo: "RepoMind",
        });
    });

    it(".git uzantısını temizler", () => {
        expect(parseRepoUrl("https://github.com/gecekusu1979/RepoMind.git")).toEqual({
            provider: "github",
            owner: "gecekusu1979",
            repo: "RepoMind",
        });
    });

    it("kısa owner/repo formatını kabul eder", () => {
        expect(parseRepoUrl("gecekusu1979/RepoMind")).toEqual({
            provider: "github",
            owner: "gecekusu1979",
            repo: "RepoMind",
        });
    });

    it("geçersiz owner/repo segmentlerinde hata fırlatır (SSRF/traversal koruması)", () => {
        expect(() => parseRepoUrl("https://github.com/../RepoMind")).toThrow();
        expect(() => parseRepoUrl("../../etc/passwd")).toThrow();
    });

    it("hiç eşleşmeyen girişte hata fırlatır", () => {
        expect(() => parseRepoUrl("not a url at all")).toThrow();
    });
});
