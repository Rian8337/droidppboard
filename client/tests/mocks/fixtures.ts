/**
 * Plain data and builders for the mocked server. Playwright imports this file too, so it must not
 * import msw, vitest or Testing Library.
 */
import type {
    CalculationResponse,
    IPrototypePP,
    PPVariant,
    PrototypePPEntry,
    RecalcEntryView,
    RecalcQueueView,
    FullRunView,
    ScorePrototypeState,
    TopPrototypePPEntry,
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

/** The scores of the mocked profile: a gain of 30 pp and a loss of 10 pp. */
export const profileScores: PrototypePPEntry[] = [
    buildScore({
        hash: "a",
        title: "Alpha Song",
        live: buildScoreState(100),
        local: buildScoreState(130),
    }),
    buildScore({
        hash: "b",
        title: "Bravo Tune",
        accuracy: 90,
        live: buildScoreState(100),
        local: buildScoreState(90),
    }),
];

/** The profile the mocked server answers for player 1000. */
export const alphaProfile: IPrototypePP = buildPlayer({
    uid: 1000,
    username: "Alpha",
    localPPTotal: 215.5,
    livePPTotal: 190,
    pp: profileScores,
});

/** The plays the mocked server answers top plays with. */
export const topPlays: TopPrototypePPEntry[] = [
    {
        ...buildScore({
            hash: "a",
            title: "Alpha Song",
            live: buildScoreState(100),
            local: buildScoreState(130),
        }),
        username: "Alpha",
    },
    {
        ...buildScore({
            hash: "b",
            title: "Bravo Tune",
            live: buildScoreState(100),
            local: buildScoreState(90),
        }),
        username: "Bravo",
    },
];

/** What the calculator answers for beatmap 1234 on the osu!droid rebalance, compared with live. */
export const droidCalculation: CalculationResponse = {
    scope: "variant",
    variant: "droid-rebalance",
    baseline: "droid-live",
    calculatorVersion: "0123456789abcdef",
    calculatedAt: "2026-10-11T13:16:00.000Z",
    beatmap: {
        id: 1234,
        hash: "0".repeat(32),
        title: "Alpha Song",
        maxCombo: 500,
        cs: 4,
        ar: 9.3,
        od: 8,
        hp: 5,
    },
    parameters: {
        beatmap: { id: 1234 },
        mods: [{ acronym: "HD" }, { acronym: "DT", settings: { speed_change: 1.25 } }],
        combo: 480,
        accuracy: 98.5,
        nmiss: 2,
    },
    result: {
        difficulty: {
            starRating: 6.12345,
            aimDifficulty: 2.5,
            tapDifficulty: 2.2,
            rhythmDifficulty: 1.1,
            readingDifficulty: 0.8,
            flashlightDifficulty: 0.4,
            unknownDifficulty: 99,
        },
        performance: {
            total: 321.4567,
            aim: 150,
            tap: 100,
            accuracy: 50,
            flashlight: 10,
            reading: 11.4567,
            effectiveMissCount: 2.5,
            tapPenalty: 1.02,
            deviation: 7.8,
            tapDeviation: 8.1,
            sliderCheesePenalty: 0.99,
        },
        strainChart: "iVBORw0KGgo=",
    },
    baselineResult: {
        difficulty: { starRating: 5.5 },
        performance: { total: 300.1234 },
        strainChart: null,
    },
    ignoredMods: [],
};

/** What the calculator answers for the same beatmap on the osu!standard rebalance, compared with live. */
export const osuCalculation: CalculationResponse = {
    ...droidCalculation,
    scope: "tool",
    variant: "osu-rebalance",
    baseline: "osu-live",
    parameters: { beatmap: { id: 1234 }, mods: [{ acronym: "HD" }] },
    result: {
        difficulty: {
            starRating: 7.1,
            aimDifficulty: 3,
            speedDifficulty: 2,
            readingDifficulty: 1,
            flashlightDifficulty: 0.5,
        },
        performance: {
            total: 400,
            aim: 200,
            speed: 120,
            accuracy: 60,
            flashlight: 10,
            reading: 10,
        },
        strainChart: null,
    },
    baselineResult: {
        difficulty: { starRating: 7 },
        performance: { total: 410 },
        strainChart: null,
    },
};

/** Builds a queue entry: a waiting one for Alpha, queued by the plain person, unless overridden. */
export function buildQueueEntry(overrides: Partial<RecalcEntryView> = {}): RecalcEntryView {
    return {
        id: "entry-1",
        uid: 1000,
        username: "Alpha",
        variant: "droid-rebalance",
        queuedByUid: plainMe.uid,
        queuedByUsername: plainMe.username,
        queuedAt: 1_790_000_000_000,
        status: "waiting",
        position: 1,
        progress: null,
        ...overrides,
    };
}

/** Builds a full run that is going, started by the admin, unless overridden. */
export function buildFullRun(overrides: Partial<FullRunView> = {}): FullRunView {
    return {
        variant: "droid-rebalance",
        status: "running",
        startedByUid: adminMe.uid,
        startedByUsername: adminMe.username,
        startedAt: 1_790_000_000_000,
        done: 1240,
        total: 8912,
        failed: 0,
        ...overrides,
    };
}

/** Builds what `GET /api/recalc/queue` answers: an empty queue of a variant unless overridden. */
export function buildQueueView(overrides: Partial<RecalcQueueView> = {}): RecalcQueueView {
    return {
        variant: "droid-rebalance",
        calculators: 2,
        estimatedWaitSeconds: 120,
        queue: [],
        recent: [],
        fullRuns: [],
        allowance: null,
        canManageFullRuns: false,
        variants: [droidRebalance, readingVariant],
        ...overrides,
    };
}

/** The shape `GET /api/manage/keys` answers per key. */
export interface AdminKeyData {
    readonly name: string;
    readonly rateLimitPerMinute: number | null;
    readonly allVariants: boolean;
    readonly canActForUsers: boolean;
    readonly grants: readonly string[];
    readonly createdAt: string;
    readonly revokedAt: string | null;
}

/** Builds an API key that is active and has no grants unless overridden. */
export function buildAdminKey(overrides: Partial<AdminKeyData> = {}): AdminKeyData {
    return {
        name: "bot",
        rateLimitPerMinute: null,
        allVariants: false,
        canActForUsers: false,
        grants: [],
        createdAt: "2026-09-01T10:00:00.000Z",
        revokedAt: null,
        ...overrides,
    };
}

/** The shape `GET /api/manage/variants` answers per variant: every variant, public or not. */
export interface AdminVariantData {
    readonly name: string;
    readonly title: string | null;
    readonly aliases: readonly string[];
    readonly description: string | null;
    readonly available: boolean;
    readonly public: boolean;
    readonly instanceCount: number;
}

/** Builds a public, available variant of the admin list unless overridden. */
export function buildAdminVariant(overrides: Partial<AdminVariantData> = {}): AdminVariantData {
    return {
        name: "droid-rebalance",
        title: null,
        aliases: [],
        description: null,
        available: true,
        public: true,
        instanceCount: 1,
        ...overrides,
    };
}

/** The shape `GET /api/manage/users` answers per person who has a role or a grant. */
export interface AdminUserData {
    readonly uid: number;
    readonly role: "admin" | "manager" | null;
    readonly grants: readonly string[];
}

/** Builds a person with no role and no grants unless overridden. */
export function buildAdminUser(overrides: Partial<AdminUserData> = {}): AdminUserData {
    return { uid: 100, role: null, grants: [], ...overrides };
}
