/**
 * Plain data and builders for the mocked server. Playwright imports this file too, so it must not
 * import msw, vitest or Testing Library.
 */
import type {
    IPrototypePP,
    PPVariant,
    PrototypePPEntry,
    ScorePrototypeState,
} from "app-structures";
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

/** Builds a leaderboard row: a player with 500 live pp and 520 local pp unless overridden. */
export function buildPlayer(overrides: Partial<IPrototypePP> = {}): IPrototypePP {
    return {
        lastUpdate: 1_790_000_000_000,
        pp: [],
        localPPTotal: 520,
        livePPTotal: 500,
        uid: 1000,
        username: "Alpha",
        reworkType: "droid-rebalance",
        ...overrides,
    };
}

/** The rows the mocked leaderboard answers with: one gains pp, one loses pp and one is unchanged. */
export const leaderboardPlayers: IPrototypePP[] = [
    buildPlayer({ uid: 1000, username: "Alpha", localPPTotal: 1520.5, livePPTotal: 1500 }),
    buildPlayer({ uid: 1001, username: "Bravo", localPPTotal: 1480, livePPTotal: 1490.25 }),
    buildPlayer({ uid: 1002, username: "Charlie", localPPTotal: 1400, livePPTotal: 1400 }),
];

/** Builds one side of a score (live, local or master) whose total pp is `total` and every other number is a fixed value. */
export function buildScoreState(
    total: number,
    overrides: Partial<ScorePrototypeState> = {},
): ScorePrototypeState {
    return {
        difficulty: {
            starRating: 5,
            aim: 2,
            tap: 2.5,
            rhythm: 1,
            flashlight: 0,
            reading: 1.5,
            speedNoteCount: 300,
        },
        performance: {
            total,
            aim: total * 0.4,
            tap: total * 0.3,
            accuracy: total * 0.2,
            flashlight: 0,
            reading: total * 0.1,
            estimatedUnstableRate: 90,
            estimatedTapUnstableRate: 100,
            tapPenalty: 1,
        },
        ...overrides,
    };
}

/** Builds a full-combo score with 100 live and 120 local pp unless overridden. */
export function buildScore(overrides: Partial<PrototypePPEntry> = {}): PrototypePPEntry {
    return {
        hash: "hash-1",
        title: "Artist - Song [Insane]",
        combo: 1000,
        maxCombo: 1000,
        mods: [],
        accuracy: 98.5,
        miss: 0,
        circleSize: 4,
        approachRate: 9,
        overallDifficulty: 8,
        hit300: 990,
        hit100: 10,
        hit50: 0,
        live: buildScoreState(100),
        local: buildScoreState(120),
        ...overrides,
    };
}
