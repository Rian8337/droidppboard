import { PPVariant } from "app-structures";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrokerClient } from "../clients/BrokerClient";
import { resolveVisibleVariant } from "./visibleVariant";

function variant(overrides: Partial<PPVariant> & { name: string }): PPVariant {
    return {
        title: null,
        aliases: [],
        description: null,
        available: true,
        healthyInstanceCount: 1,
        mode: "droid",
        algorithm: "rebalance",
        ...overrides,
    };
}

function stubVariants(variants: PPVariant[] | null) {
    return vi.spyOn(BrokerClient, "getVariants").mockResolvedValue(variants);
}

describe("resolveVisibleVariant", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("defaults to droid-rebalance", async () => {
        stubVariants([
            variant({ name: "droid-live" }),
            variant({ name: "droid-rebalance" }),
        ]);

        const result = await resolveVisibleVariant(undefined);

        expect(result).not.toBe("notFound");
        expect(result).not.toBe("unavailable");
        expect((result as { current: PPVariant }).current.name).toBe(
            "droid-rebalance",
        );
    });

    it("resolves aliases to the canonical name", async () => {
        stubVariants([
            variant({ name: "droid-rebalance", aliases: ["rebalance"] }),
        ]);

        const result = await resolveVisibleVariant("rebalance");

        expect((result as { current: PPVariant }).current.name).toBe(
            "droid-rebalance",
        );
    });

    it("answers private variants as not found for visitors", async () => {
        // The broker leaves private variants out of a visitor's list.
        const getVariants = stubVariants([
            variant({ name: "droid-rebalance" }),
        ]);

        expect(await resolveVisibleVariant("secret")).toBe("notFound");
        expect(getVariants).toHaveBeenCalledWith(undefined);
    });

    it("lists variants visible to the acting person", async () => {
        const getVariants = stubVariants([
            variant({ name: "droid-rebalance" }),
            variant({ name: "secret" }),
        ]);

        const result = await resolveVisibleVariant("secret", 1234);

        expect((result as { current: PPVariant }).current.name).toBe("secret");
        expect(getVariants).toHaveBeenCalledWith(1234);
    });

    it("reports an unavailable list", async () => {
        stubVariants(null);

        expect(await resolveVisibleVariant("droid-rebalance")).toBe(
            "unavailable",
        );
    });

    it("offers only droid variants", async () => {
        stubVariants([
            variant({ name: "osu-live", mode: "osu" }),
            variant({ name: "unknown-mode", mode: null }),
            variant({ name: "b-droid" }),
            variant({ name: "a-droid" }),
        ]);

        const result = await resolveVisibleVariant("b-droid");

        expect(
            (result as { variants: PPVariant[] }).variants.map((v) => v.name),
        ).toEqual(["a-droid", "b-droid", "unknown-mode"]);
        expect(await resolveVisibleVariant("osu-live")).toBe("notFound");
    });

    it("treats a name that is not a string as not found", async () => {
        stubVariants([variant({ name: "droid-rebalance" })]);

        expect(
            await resolveVisibleVariant([
                "droid-rebalance",
            ] as unknown as string),
        ).toBe("notFound");
    });
});
