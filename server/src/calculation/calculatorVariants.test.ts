import { describe, expect, it } from "vitest";
import {
    getBaselineVariant,
    isToolVariantName,
    toolVariantNames,
} from "./calculatorVariants";

describe("getBaselineVariant", () => {
    it("compares every variant of the board with droid-live", () => {
        expect(getBaselineVariant("variant", "droid-rebalance")).toBe(
            "droid-live",
        );
        expect(getBaselineVariant("variant", "secret")).toBe("droid-live");
    });

    it("compares droid-rebalance with droid-live in the tool", () => {
        expect(getBaselineVariant("tool", "droid-rebalance")).toBe(
            "droid-live",
        );
    });

    it("compares osu-rebalance with osu-live in the tool", () => {
        expect(getBaselineVariant("tool", "osu-rebalance")).toBe("osu-live");
    });

    it.each(["droid-live", "osu-live"])(
        "has no baseline for %s in the tool",
        (variant) => {
            expect(getBaselineVariant("tool", variant)).toBeNull();
        },
    );

    it("has no baseline for a name that is not a tool variant", () => {
        expect(getBaselineVariant("tool", "flowaim")).toBeNull();
    });
});

describe("isToolVariantName", () => {
    it("accepts the four tool variants only", () => {
        expect(toolVariantNames.every((n) => isToolVariantName(n))).toBe(true);
        expect(toolVariantNames).toHaveLength(4);
        expect(isToolVariantName("flowaim")).toBe(false);
    });
});
