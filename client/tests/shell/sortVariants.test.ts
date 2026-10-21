import { sortVariants } from "../../src/shell/sortVariants";
import { buildVariant } from "../mocks/fixtures";

describe("sortVariants", () => {
    it("puts droid-rebalance first, then newest first, then those never built", () => {
        const sorted = sortVariants([
            buildVariant({ name: "never", builtAt: null }),
            buildVariant({ name: "older", builtAt: "2026-09-01T00:00:00.000Z" }),
            buildVariant({ name: "droid-rebalance", builtAt: "2026-01-01T00:00:00.000Z" }),
            buildVariant({ name: "newer", builtAt: "2026-10-01T00:00:00.000Z" }),
        ]);

        expect(sorted.map((variant) => variant.name)).toEqual([
            "droid-rebalance",
            "newer",
            "older",
            "never",
        ]);
    });

    it("puts pinned variants after droid-rebalance and ahead of the rest, newest first", () => {
        const sorted = sortVariants([
            buildVariant({ name: "newest", builtAt: "2026-10-10T00:00:00.000Z" }),
            buildVariant({ name: "pinned-old", pinned: true, builtAt: "2026-08-01T00:00:00.000Z" }),
            buildVariant({ name: "droid-rebalance", builtAt: "2026-01-01T00:00:00.000Z" }),
            buildVariant({ name: "pinned-new", pinned: true, builtAt: "2026-09-01T00:00:00.000Z" }),
        ]);

        expect(sorted.map((variant) => variant.name)).toEqual([
            "droid-rebalance",
            "pinned-new",
            "pinned-old",
            "newest",
        ]);
    });

    it("keeps droid-rebalance first even when other variants are pinned", () => {
        const sorted = sortVariants([
            buildVariant({ name: "pinned", pinned: true }),
            buildVariant({ name: "droid-rebalance" }),
        ]);

        expect(sorted.map((variant) => variant.name)).toEqual(["droid-rebalance", "pinned"]);
    });

    it("breaks ties by name", () => {
        const builtAt = "2026-10-01T00:00:00.000Z";
        const sorted = sortVariants([
            buildVariant({ name: "b", builtAt }),
            buildVariant({ name: "a", builtAt }),
            buildVariant({ name: "d", builtAt: null }),
            buildVariant({ name: "c", builtAt: null }),
        ]);

        expect(sorted.map((variant) => variant.name)).toEqual(["a", "b", "c", "d"]);
    });

    it("does not change the list it is given", () => {
        const variants = [buildVariant({ name: "b" }), buildVariant({ name: "a" })];

        sortVariants(variants);

        expect(variants.map((variant) => variant.name)).toEqual(["b", "a"]);
    });
});
