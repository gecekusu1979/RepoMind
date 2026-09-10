import { describe, it, expect } from "vitest";
import { classifyPulse } from "./repoPulse";

describe("classifyPulse", () => {
    it("60 günden az ise 'active' döner", () => {
        expect(classifyPulse(0)).toBe("active");
        expect(classifyPulse(59)).toBe("active");
    });

    it("60-179 gün arası 'low' döner", () => {
        expect(classifyPulse(60)).toBe("low");
        expect(classifyPulse(179)).toBe("low");
    });

    it("180 gün ve üzeri 'zombie' döner", () => {
        expect(classifyPulse(180)).toBe("zombie");
        expect(classifyPulse(1000)).toBe("zombie");
    });
});
