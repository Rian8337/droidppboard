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
