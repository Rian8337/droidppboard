import { PrototypePPEntry, ScorePrototypeState } from "app-structures";
import { describe, expect, it } from "vitest";
import {
    collectReusableScores,
    ReusableProfile,
    UnfinishedProfiles,
} from "./ReusableCalculations";

function state(total: number): ScorePrototypeState {
    return { performance: { total } } as ScorePrototypeState;
}

function entry(
    scoreId: number | undefined,
    totals: { live: number; local: number; master?: number },
): PrototypePPEntry {
    return {
        scoreId,
        live: state(totals.live),
        local: state(totals.local),
        ...(totals.master !== undefined && { master: state(totals.master) }),
    } as PrototypePPEntry;
}

const builds = {
    "droid-live": "live-1",
    experiment: "experiment-1",
    "droid-rebalance": "master-1",
};
const variants = ["droid-live", "experiment", "droid-rebalance"];

describe("collectReusableScores", () => {
    it("collects each variant's state from where a profile holds it", () => {
        const profiles: ReusableProfile[] = [
            {
                reworkType: "experiment",
                pp: [entry(1, { live: 10, local: 20, master: 30 })],
                calculatorBuilds: builds,
            },
        ];

        const score = collectReusableScores(profiles, variants, builds).get(1);

        expect(score?.states).toEqual(
            new Map([
                ["droid-live", state(10)],
                ["experiment", state(20)],
                ["droid-rebalance", state(30)],
            ]),
        );
    });

    it("takes the master state from the master profile's local", () => {
        const profiles: ReusableProfile[] = [
            {
                reworkType: "droid-rebalance",
                pp: [entry(1, { live: 10, local: 30 })],
                calculatorBuilds: {
                    "droid-live": "live-1",
                    "droid-rebalance": "master-1",
                },
            },
        ];

        const score = collectReusableScores(profiles, variants, builds).get(1);

        expect(score?.states).toEqual(
            new Map([
                ["droid-live", state(10)],
                ["droid-rebalance", state(30)],
            ]),
        );
    });

    it("leaves out variants whose recorded build is not the current one", () => {
        const profiles: ReusableProfile[] = [
            {
                reworkType: "experiment",
                pp: [entry(1, { live: 10, local: 20, master: 30 })],
                calculatorBuilds: { ...builds, experiment: "experiment-0" },
            },
        ];

        const withoutExperiment = {
            "droid-live": builds["droid-live"],
            "droid-rebalance": builds["droid-rebalance"],
        };
        const score = collectReusableScores(profiles, variants, builds).get(1);

        expect([...(score?.states.keys() ?? [])]).toEqual([
            "droid-live",
            "droid-rebalance",
        ]);
        // Nor is a variant whose current build is unknown.
        expect(
            collectReusableScores(profiles, variants, withoutExperiment)
                .get(1)
                ?.states.has("experiment"),
        ).toBe(false);
    });

    it("leaves out entries without a score ID and profiles without builds", () => {
        const profiles: ReusableProfile[] = [
            {
                reworkType: "experiment",
                pp: [entry(undefined, { live: 10, local: 20 })],
                calculatorBuilds: builds,
            },
            {
                reworkType: "experiment",
                pp: [entry(2, { live: 10, local: 20 })],
            },
        ];

        expect(collectReusableScores(profiles, variants, builds).size).toBe(0);
    });

    it("prefers the earlier profile's state", () => {
        const profiles: ReusableProfile[] = [
            {
                reworkType: "experiment",
                pp: [entry(1, { live: 10, local: 20 })],
                calculatorBuilds: builds,
            },
            {
                reworkType: "other",
                pp: [entry(1, { live: 11, local: 21 })],
                calculatorBuilds: builds,
            },
        ];

        expect(
            collectReusableScores(profiles, variants, builds)
                .get(1)
                ?.states.get("droid-live"),
        ).toEqual(state(10));
    });
});

describe("UnfinishedProfiles", () => {
    const profile: ReusableProfile = { reworkType: "experiment", pp: [] };

    it("holds a profile per player and variant", () => {
        const profiles = new UnfinishedProfiles();

        profiles.set(7, "experiment", profile);

        expect(profiles.get(7, "experiment")).toBe(profile);
        expect(profiles.get(7, "other")).toBeUndefined();
        expect(profiles.get(8, "experiment")).toBeUndefined();

        profiles.delete(7, "experiment");

        expect(profiles.get(7, "experiment")).toBeUndefined();
    });

    it("drops the oldest profile when full", () => {
        const profiles = new UnfinishedProfiles(2);

        profiles.set(1, "experiment", profile);
        profiles.set(2, "experiment", profile);
        // Setting a profile again makes it the newest.
        profiles.set(1, "experiment", profile);
        profiles.set(3, "experiment", profile);

        expect(profiles.get(1, "experiment")).toBe(profile);
        expect(profiles.get(2, "experiment")).toBeUndefined();
        expect(profiles.get(3, "experiment")).toBe(profile);
    });
});
