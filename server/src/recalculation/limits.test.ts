import { describe, expect, it } from "vitest";
import { readRecalcLimits } from "./limits";

describe("readRecalcLimits", () => {
    it("uses defaults for missing or invalid values", () => {
        const defaults = {
            maxActivePerPerson: 5,
            addCooldownSeconds: 10,
            finishedRetentionMinutes: 60,
        };

        expect(readRecalcLimits({})).toEqual(defaults);
        expect(
            readRecalcLimits({
                RECALC_MAX_ACTIVE_PER_PERSON: "0",
                RECALC_ADD_COOLDOWN_SECONDS: "-3",
                RECALC_FINISHED_RETENTION_MINUTES: "abc",
            }),
        ).toEqual(defaults);
        expect(
            readRecalcLimits({
                RECALC_MAX_ACTIVE_PER_PERSON: "2.5",
                RECALC_ADD_COOLDOWN_SECONDS: "",
            }),
        ).toEqual(defaults);
    });

    it("reads positive integers", () => {
        expect(
            readRecalcLimits({
                RECALC_MAX_ACTIVE_PER_PERSON: "3",
                RECALC_ADD_COOLDOWN_SECONDS: "20",
                RECALC_FINISHED_RETENTION_MINUTES: "15",
            }),
        ).toEqual({
            maxActivePerPerson: 3,
            addCooldownSeconds: 20,
            finishedRetentionMinutes: 15,
        });
    });
});
