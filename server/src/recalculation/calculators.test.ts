import { afterEach, describe, expect, it, vi } from "vitest";
import { BrokerClient } from "../clients/BrokerClient";
import { calculatorCount, getVariantCalculatorCount } from "./calculators";

describe("calculatorCount", () => {
    it("is the healthy instance count", () => {
        expect(calculatorCount({ healthyInstanceCount: 3 })).toBe(3);
        expect(calculatorCount({ healthyInstanceCount: 0 })).toBe(0);
    });

    it("is 0 when the count is missing or not a number", () => {
        expect(calculatorCount({} as never)).toBe(0);
        expect(calculatorCount({ healthyInstanceCount: "2" } as never)).toBe(
            0,
        );
        expect(calculatorCount({ healthyInstanceCount: NaN })).toBe(0);
        expect(calculatorCount({ healthyInstanceCount: -1 })).toBe(0);
    });
});

describe("getVariantCalculatorCount", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("asks the broker for the acting person", async () => {
        const getVariant = vi
            .spyOn(BrokerClient, "getVariant")
            .mockResolvedValue({ healthyInstanceCount: 2 } as never);

        expect(await getVariantCalculatorCount("a", 5)).toBe(2);
        expect(getVariant).toHaveBeenCalledWith("a", 5);
    });

    it("is null when the variant cannot be fetched", async () => {
        vi.spyOn(BrokerClient, "getVariant").mockResolvedValue(null);

        expect(await getVariantCalculatorCount("a", 5)).toBeNull();
    });

    it("is 0 when a broker that predates the count answers without it", async () => {
        vi.spyOn(BrokerClient, "getVariant").mockResolvedValue({
            name: "a",
        } as never);

        expect(await getVariantCalculatorCount("a", 5)).toBe(0);
    });
});
