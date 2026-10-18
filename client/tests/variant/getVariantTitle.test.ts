import { getVariantTitle } from "../../src/variant/getVariantTitle";
import { buildVariant } from "../mocks/fixtures";

describe("getVariantTitle", () => {
    it("is the title when the variant has one", () => {
        expect(getVariantTitle(buildVariant({ name: "flowaim", title: "Flow aim" }))).toBe(
            "Flow aim",
        );
    });

    it("is the name when the variant has no title", () => {
        expect(getVariantTitle(buildVariant({ name: "flowaim", title: null }))).toBe("flowaim");
    });
});
