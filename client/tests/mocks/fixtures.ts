/**
 * Plain data and builders for the mocked server. Playwright imports this file too, so it must not
 * import msw, vitest or Testing Library.
 */
import type { PPVariant } from "app-structures";
import type { Me } from "../../src/api/auth";

/** Builds a variant, which is a public osu!droid rebalance one unless overridden. */
export function buildVariant(overrides: Partial<PPVariant> = {}): PPVariant {
    return {
        name: "droid-rebalance",
        title: null,
        aliases: [],
        description: null,
        available: true,
        healthyInstanceCount: 1,
        mode: "droid",
        algorithm: "rebalance",
        public: true,
        builtAt: "2026-10-11T13:16:00.000Z",
        calculatorVersion: "1.0.0",
        ...overrides,
    };
}

/** Builds the person `GET /api/auth/me` answers with, who is a plain user unless overridden. */
export function buildMe(overrides: Partial<Me> = {}): Me {
    return {
        uid: 100,
        username: "player",
        role: null,
        grants: [],
        ...overrides,
    };
}

export const droidRebalance: PPVariant = buildVariant({
    name: "droid-rebalance",
    title: "Rebalance",
    aliases: ["rebalance"],
    description: "The rebalanced osu!droid performance point system.",
});

/** A private variant that was built before the others. */
export const flowaim: PPVariant = buildVariant({
    name: "flowaim",
    title: "Flow aim",
    description: "An experiment with flow aim.",
    public: false,
    builtAt: "2026-09-02T08:30:00.000Z",
    calculatorVersion: "0.9.0",
});

export const readingVariant: PPVariant = buildVariant({
    name: "reading",
    title: "Reading",
    description: "Adds a reading skill.",
    builtAt: "2026-10-05T19:00:00.000Z",
    calculatorVersion: "1.1.0",
});

export const adminMe: Me = buildMe({ uid: 1, username: "admin", role: "admin" });

export const managerMe: Me = buildMe({
    uid: 2,
    username: "manager",
    role: "manager",
    grants: ["flowaim"],
});

export const plainMe: Me = buildMe();
