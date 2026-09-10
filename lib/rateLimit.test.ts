import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { checkRateLimit } from "./rateLimit";

function makeRequest(ip: string): NextRequest {
    return new NextRequest("https://example.com/api/analyze", {
        headers: { "x-forwarded-for": ip },
    });
}

describe("checkRateLimit", () => {
    it("limit dolana kadar isteklere izin verir", () => {
        const req = makeRequest("1.2.3.4");
        const routeKey = `test-allow-${Math.random()}`;
        for (let i = 0; i < 3; i++) {
            const result = checkRateLimit(req, routeKey, 3, 60_000);
            expect(result.ok).toBe(true);
        }
    });

    it("limit aşıldığında isteği reddeder", () => {
        const req = makeRequest("5.6.7.8");
        const routeKey = `test-block-${Math.random()}`;
        for (let i = 0; i < 3; i++) {
            checkRateLimit(req, routeKey, 3, 60_000);
        }
        const blocked = checkRateLimit(req, routeKey, 3, 60_000);
        expect(blocked.ok).toBe(false);
        expect(blocked.remaining).toBe(0);
    });

    it("farklı IP'leri birbirinden bağımsız sayar", () => {
        const routeKey = `test-isolate-${Math.random()}`;
        const reqA = makeRequest("9.9.9.9");
        const reqB = makeRequest("8.8.8.8");
        for (let i = 0; i < 3; i++) checkRateLimit(reqA, routeKey, 3, 60_000);

        const blockedA = checkRateLimit(reqA, routeKey, 3, 60_000);
        const stillOkB = checkRateLimit(reqB, routeKey, 3, 60_000);

        expect(blockedA.ok).toBe(false);
        expect(stillOkB.ok).toBe(true);
    });
});
