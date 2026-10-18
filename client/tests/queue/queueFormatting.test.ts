import {
    formatAge,
    formatCooldown,
    formatEstimatedWait,
    formatSlots,
    getEntryCounts,
} from "../../src/queue/queueFormatting";
import { buildQueueEntry } from "../mocks/fixtures";

describe("formatEstimatedWait", () => {
    it.each([
        [null, "unknown"],
        [Number.NaN, "unknown"],
        [0, "under a minute"],
        [59, "under a minute"],
        [60, "~1 min"],
        [150, "~3 min"],
        [7140, "~119 min"],
        [7200, "~2 h"],
        [36000, "~10 h"],
    ])("describes %s as %s", (seconds, expected) => {
        expect(formatEstimatedWait(seconds)).toBe(expected);
    });
});

describe("formatCooldown", () => {
    it.each([
        [0, "0:00"],
        [-5, "0:00"],
        [0.2, "0:01"],
        [9, "0:09"],
        [90, "1:30"],
        [600, "10:00"],
    ])("shows %s seconds as %s", (seconds, expected) => {
        expect(formatCooldown(seconds)).toBe(expected);
    });
});

describe("formatAge", () => {
    const now = 1_790_000_000_000;

    it.each([
        [0, "just now"],
        [59_000, "just now"],
        [-5_000, "just now"],
        [60_000, "1 min ago"],
        [59 * 60_000, "59 min ago"],
        [60 * 60_000, "1 h ago"],
        [23 * 3_600_000, "23 h ago"],
        [24 * 3_600_000, "1 d ago"],
        [72 * 3_600_000, "3 d ago"],
    ])("describes %s ms ago as %s", (elapsed, expected) => {
        expect(formatAge(now - elapsed, now)).toBe(expected);
    });
});

describe("formatSlots", () => {
    it.each([
        [0, 3, "You can queue 3 more players"],
        [2, 3, "You can queue 1 more player"],
        [3, 3, "You can queue 0 more players"],
        [5, 3, "You can queue 0 more players"],
    ])("says %s of %s used as %s", (active, maxActive, expected) => {
        expect(formatSlots({ active, maxActive, cooldownRemainingSeconds: 0 })).toBe(expected);
    });
});

describe("getEntryCounts", () => {
    it("counts calculating and waiting entries and ignores finished ones", () => {
        const entries = [
            buildQueueEntry({ id: "a", status: "calculating" }),
            buildQueueEntry({ id: "b", status: "waiting" }),
            buildQueueEntry({ id: "c", status: "waiting" }),
            buildQueueEntry({ id: "d", status: "done" }),
        ];

        expect(getEntryCounts(entries)).toEqual({ running: 1, waiting: 2 });
    });
});
