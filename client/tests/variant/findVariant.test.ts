import { findVariant } from "../../src/variant/findVariant";
import { droidRebalance, flowaim } from "../mocks/fixtures";

describe("findVariant", () => {
    const variants = [droidRebalance, flowaim];

    it("finds a variant by name", () => {
        expect(findVariant(variants, "flowaim")).toBe(flowaim);
    });

    it("finds a variant by alias", () => {
        expect(findVariant(variants, "rebalance")).toBe(droidRebalance);
    });

    it("finds nothing for an unknown name, no name or no variants", () => {
        expect(findVariant(variants, "nothing")).toBeUndefined();
        expect(findVariant(variants, undefined)).toBeUndefined();
        expect(findVariant(undefined, "flowaim")).toBeUndefined();
    });
});
