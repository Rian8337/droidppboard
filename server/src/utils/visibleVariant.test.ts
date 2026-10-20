import { PPVariant } from "app-structures";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrokerClient } from "../clients/BrokerClient";
import {
    findListedVariant,
    listVisibleDroidVariants,
    resolveVisibleVariant,
} from "./visibleVariant";

function variant(overrides: Partial<PPVariant> & { name: string }): PPVariant {
    return {
        title: null,
        aliases: [],
        description: null,
        available: true,
        healthyInstanceCount: 1,
        mode: "droid",
        algorithm: "rebalance",
        public: true,
        builtAt: null,
        calculatorVersion: null,
        ...overrides,
    };
}

function stubVariants(variants: PPVariant[] | null) {
    return vi.spyOn(BrokerClient, "getVariants").mockResolvedValue(variants);
}

function stubVariant(answer: PPVariant | "notFound" | null) {
    return vi.spyOn(BrokerClient, "getVariant").mockResolvedValue(answer);
}

describe("resolveVisibleVariant", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("defaults to droid-rebalance", async () => {
        const getVariant = stubVariant(variant({ name: "droid-rebalance" }));

        expect(await resolveVisibleVariant(undefined)).toEqual(
            variant({ name: "droid-rebalance" }),
        );
        expect(getVariant).toHaveBeenCalledWith("droid-rebalance", undefined);
    });

    it("asks the broker for that variant alone, acting for the person", async () => {
        const getVariants = vi.spyOn(BrokerClient, "getVariants");
        const getVariant = stubVariant(
            variant({ name: "droid-rebalance", aliases: ["rebalance"] }),
        );

        const result = await resolveVisibleVariant("rebalance", 1234);

        expect((result as PPVariant).name).toBe("droid-rebalance");
        expect(getVariant).toHaveBeenCalledWith("rebalance", 1234);
        expect(getVariants).not.toHaveBeenCalled();
    });

    it("answers notFound for a variant the broker does not show the person", async () => {
        // The broker answers a private variant the same as one that does not exist.
        stubVariant("notFound");

        expect(await resolveVisibleVariant("secret")).toBe("notFound");
    });

    it("reports an unavailable broker", async () => {
        stubVariant(null);

        expect(await resolveVisibleVariant("droid-rebalance")).toBe(
            "unavailable",
        );
    });

    it("offers only droid variants", async () => {
        stubVariant(variant({ name: "unknown-mode", mode: null }));
        expect(await resolveVisibleVariant("unknown-mode")).toEqual(
            variant({ name: "unknown-mode", mode: null }),
        );

        stubVariant(variant({ name: "osu-live", mode: "osu" }));
        expect(await resolveVisibleVariant("osu-live")).toBe("notFound");
    });

    it("answers notFound for droid-live, even by an alias", async () => {
        stubVariant(variant({ name: "droid-live", aliases: ["live"] }));

        expect(await resolveVisibleVariant("droid-live")).toBe("notFound");
        expect(await resolveVisibleVariant("live")).toBe("notFound");
    });

    it("treats a name that is not a string as not found", async () => {
        const getVariant = stubVariant(variant({ name: "droid-rebalance" }));

        expect(
            await resolveVisibleVariant([
                "droid-rebalance",
            ] as unknown as string),
        ).toBe("notFound");
        expect(getVariant).not.toHaveBeenCalled();
    });
});

describe("findListedVariant", () => {
    const variants = [
        variant({ name: "droid-rebalance", aliases: ["rebalance"] }),
        variant({ name: "flowaim" }),
    ];

    it("finds a variant by its name or an alias", () => {
        expect(findListedVariant(variants, "flowaim")?.name).toBe("flowaim");
        expect(findListedVariant(variants, "rebalance")?.name).toBe(
            "droid-rebalance",
        );
    });

    it("answers undefined for a variant that is not listed", () => {
        expect(findListedVariant(variants, "secret")).toBeUndefined();
    });
});

describe("listVisibleDroidVariants", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("leaves out droid-live", async () => {
        stubVariants([
            variant({ name: "droid-live" }),
            variant({ name: "droid-rebalance" }),
            variant({ name: "osu-rebalance", mode: "osu" }),
            variant({ name: "flowaim" }),
        ]);

        const result = await listVisibleDroidVariants();

        expect(result?.map((v) => v.name)).toEqual([
            "droid-rebalance",
            "flowaim",
        ]);
    });
});
