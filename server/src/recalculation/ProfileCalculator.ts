import {
    Accuracy,
    BeatmapDifficulty,
    MapInfo,
    Modes,
    ModUtil,
    SerializedMod,
} from "@rian8337/osu-base";
import {
    IPrototypePP,
    PrototypePPEntry,
    ScorePrototypeState,
} from "app-structures";
import { OsuDroidAccounts } from "../auth/OsuDroidAccounts";
import { BrokerClient } from "../clients/BrokerClient";
import { DatabaseManager } from "../database/managers/DatabaseManager";
import { getBeatmapByHash } from "./BeatmapService";
import { getTopScores, TopScore } from "./OfficialScores";
import {
    collectReusableScores,
    liveVariant,
    masterVariant,
    ReusableProfile,
    ReusableScore,
    UnfinishedProfiles,
} from "./ReusableCalculations";
import { OnlineScoreResponse, ScoreServiceClient } from "./ScoreServiceClient";
import { weightedTotal } from "./weightedTotal";

/**
 * The outcome of calculating a player's profile.
 */
export type ProfileOutcome =
    | { ok: true; livePPTotal: number; localPPTotal: number }
    | { ok: false; reason: string };

/**
 * The services that a profile calculation uses.
 */
export interface ProfileCalculatorDeps {
    findPlayer: typeof OsuDroidAccounts.findPlayer;
    getTopScores: typeof getTopScores;
    getBeatmapByHash: typeof getBeatmapByHash;
    getOnlineScore: typeof ScoreServiceClient.getOnlineScore;

    /**
     * Gets when a variant's calculator was built, or `null` if it cannot be told.
     */
    getBuiltAt: (variant: string, actingUid: number) => Promise<string | null>;

    /**
     * Gets the player's stored profiles, in every variant, that recorded one of the given builds.
     */
    getReusableProfiles: (
        uid: number,
        builds: Readonly<Record<string, string>>,
    ) => Promise<ReusableProfile[]>;
    saveProfile: (
        uid: number,
        reworkType: string,
        profile: Pick<
            IPrototypePP,
            | "pp"
            | "localPPTotal"
            | "livePPTotal"
            | "masterPPTotal"
            | "username"
            | "calculatorBuilds"
        >,
    ) => Promise<void>;
    unfinishedProfiles: UnfinishedProfiles;
}

const defaultDeps: ProfileCalculatorDeps = {
    findPlayer: (uidOrUsername) => OsuDroidAccounts.findPlayer(uidOrUsername),
    getTopScores,
    getBeatmapByHash,
    getOnlineScore: (...args) => ScoreServiceClient.getOnlineScore(...args),
    getBuiltAt: async (variant, actingUid) => {
        const found = await BrokerClient.getVariant(variant, actingUid);

        return found === null || found === "notFound" ? null : found.builtAt;
    },
    getReusableProfiles: (uid, builds) =>
        DatabaseManager.aliceDb.collections.prototypePP.getReusableProfiles(
            uid,
            builds,
        ),
    saveProfile: (uid, reworkType, profile) =>
        DatabaseManager.aliceDb.collections.prototypePP.saveProfile(
            uid,
            reworkType,
            profile,
        ),
    unfinishedProfiles: new UnfinishedProfiles(),
};

function toState(
    calculation: OnlineScoreResponse["calculation"],
): ScorePrototypeState {
    const { difficulty, performance } = calculation;

    return {
        difficulty: {
            starRating: difficulty.starRating,
            aim: difficulty.aimDifficulty,
            tap: difficulty.tapDifficulty,
            rhythm: difficulty.rhythmDifficulty,
            flashlight: difficulty.flashlightDifficulty,
            reading: difficulty.readingDifficulty,
            speedNoteCount: difficulty.speedNoteCount,
        },
        performance: {
            total: performance.total,
            aim: performance.aim,
            tap: performance.tap,
            accuracy: performance.accuracy,
            flashlight: performance.flashlight,
            reading: performance.reading,
            estimatedUnstableRate: performance.deviation * 10,
            estimatedTapUnstableRate: performance.tapDeviation * 10,
            tapPenalty: performance.tapPenalty,
        },
    };
}

/**
 * Calculates a player's profile for a prototype variant and stores it.
 *
 * Unlike a score that does not exist, which is skipped, an error from any service fails the whole player and
 * nothing is stored, so that a profile never silently misses scores.
 *
 * A score's calculation of a variant is reused rather than requested again when one of the player's profiles holds it
 * for the variant's current build, or when an earlier failed attempt finished it.
 *
 * @param uid The uid of the player.
 * @param variant The canonical name of the variant to recalculate with.
 * @param actingUid The uid of the person that the calculation is made on behalf of.
 * @param onProgress Called after each of the player's top scores is processed, skipped ones included.
 * @param deps The services to use.
 * @returns The outcome.
 */
export async function calculateProfile(
    uid: number,
    variant: string,
    actingUid: number,
    onProgress: (done: number, total: number) => void,
    deps: ProfileCalculatorDeps = defaultDeps,
): Promise<ProfileOutcome> {
    let outcome: ProfileOutcome;

    try {
        outcome = await calculate(uid, variant, actingUid, onProgress, deps);
    } catch (e) {
        console.error(`Profile calculation of uid ${uid.toString()} threw:`, e);

        outcome = { ok: false, reason: "Unexpected error" };
    }

    console.info(
        `[recalculation] uid=${uid.toString()} variant=${variant} ${
            outcome.ok ? "succeeded" : `failed: ${outcome.reason}`
        }`,
    );

    return outcome;
}

async function calculate(
    uid: number,
    variant: string,
    actingUid: number,
    onProgress: (done: number, total: number) => void,
    deps: ProfileCalculatorDeps,
): Promise<ProfileOutcome> {
    const player = await deps.findPlayer(uid);

    if (!player) {
        return { ok: false, reason: "Player not found" };
    }

    const scores = await deps.getTopScores(uid);

    if (scores.length === 0) {
        return { ok: false, reason: "Failed to fetch top scores" };
    }

    const includeMaster = variant !== masterVariant;
    const variants = includeMaster
        ? [liveVariant, variant, masterVariant]
        : [liveVariant, variant];

    const builds = await getBuilds(variants, actingUid, deps);
    const storedProfiles = await deps.getReusableProfiles(uid, builds);
    const unfinished = deps.unfinishedProfiles.get(uid, variant);
    const reusable = collectReusableScores(
        unfinished ? [unfinished, ...storedProfiles] : storedProfiles,
        variants,
        builds,
    );

    const entries: PrototypePPEntry[] = [];

    // Scores go one at a time, as the variant's calculator serves one score of a player at once.
    for (let i = 0; i < scores.length; ++i) {
        const entry = await createEntry(
            uid,
            scores[i],
            variants,
            reusable.get(scores[i].id),
            actingUid,
            deps,
        );

        if (entry !== null && "reason" in entry) {
            // The finished scores were calculated for these builds, as far as can be told.
            deps.unfinishedProfiles.set(uid, variant, {
                reworkType: variant,
                pp: entries,
                calculatorBuilds: builds,
            });

            return { ok: false, reason: entry.reason };
        }

        if (entry !== null) {
            entries.push(entry);
        }

        onProgress(i + 1, scores.length);
    }

    deps.unfinishedProfiles.delete(uid, variant);

    // Do not overwrite a stored profile with an empty one when nothing could be calculated.
    if (entries.length === 0) {
        return { ok: false, reason: "No scores could be calculated" };
    }

    entries.sort(
        (a, b) => b.local.performance.total - a.local.performance.total,
    );

    const livePPTotal = weightedTotal(
        entries.map((e) => e.live.performance.total),
    );
    const localPPTotal = weightedTotal(
        entries.map((e) => e.local.performance.total),
    );
    const masterPPTotal = includeMaster
        ? weightedTotal(
              entries.map((e) => (e.master ?? e.live).performance.total),
          )
        : undefined;

    // A build that changed during the calculation may have calculated some scores with either build, so it is not
    // recorded, and the next calculation calculates that variant again.
    //
    // This cannot catch a rolling deploy: once a new instance is healthy, the broker reports its build while older
    // instances may still answer, so a calculation from an old build can be recorded under the new one. Telling it
    // apart needs each calculation to state its build.
    const buildsAfter = await getBuilds(variants, actingUid, deps);
    const calculatorBuilds = Object.fromEntries(
        Object.entries(builds).filter(
            ([name, build]) => buildsAfter[name] === build,
        ),
    );

    await deps.saveProfile(uid, variant, {
        pp: entries,
        livePPTotal,
        localPPTotal,
        masterPPTotal,
        username: player.username,
        calculatorBuilds,
    });

    return { ok: true, livePPTotal, localPPTotal };
}

/**
 * Gets the current build of each variant that can be told. A lookup that fails only means that the variant's
 * calculations are not reused, so it does not fail the player.
 */
async function getBuilds(
    variants: readonly string[],
    actingUid: number,
    deps: ProfileCalculatorDeps,
): Promise<Record<string, string>> {
    const builds = await Promise.all(
        variants.map(async (name) => {
            try {
                return [name, await deps.getBuiltAt(name, actingUid)] as const;
            } catch (e) {
                console.error(`Build lookup of ${name} threw:`, e);

                return [name, null] as const;
            }
        }),
    );

    return Object.fromEntries(
        builds.filter((build): build is readonly [string, string] =>
            Boolean(build[1]),
        ),
    );
}

/**
 * The values of a score that do not depend on the variant.
 */
interface ScoreValues {
    readonly mods: SerializedMod[];
    readonly combo: number;
    readonly maxCombo: number;
    readonly accuracy: number;
    readonly hit300: number;
    readonly hit100: number;
    readonly hit50: number;
    readonly miss: number;
}

function getScoreValues(live: OnlineScoreResponse): ScoreValues {
    const { score, difficulty } = live.calculation;
    const accuracy = new Accuracy(score);

    return {
        // The difficulty attributes hold only the difficulty-adjusting mods, whereas the score has all of them.
        mods: live.score.mods,
        combo: score.combo,
        maxCombo: difficulty.maxCombo,
        accuracy: accuracy.value * 100,
        hit300: accuracy.n300,
        hit100: accuracy.n100,
        hit50: accuracy.n50,
        miss: accuracy.nmiss,
    };
}

type CalculationOutcome =
    | Awaited<ReturnType<ProfileCalculatorDeps["getOnlineScore"]>>
    | { kind: "reused"; state: ScorePrototypeState };

/**
 * Looks a score's beatmap up and calculates the score for each variant whose calculation cannot be reused, all at the
 * same time.
 *
 * The outcomes are judged in order, beatmap first, so that a skip or error that comes before another decides the
 * result, as when the lookups went one after another.
 *
 * The score service finds the score by the hash it was set on, which differs from the beatmap's current hash when the
 * beatmap was updated since.
 *
 * @param variants The live, local, and (if asked) master variants, in that order.
 * @param reusable The calculations of the score that can be reused, if any.
 * @returns The entry, `null` if the beatmap or the score does not exist for one of the variants, or the reason for
 * why a service failed.
 */
async function createEntry(
    uid: number,
    score: TopScore,
    variants: readonly string[],
    reusable: ReusableScore | undefined,
    actingUid: number,
    deps: ProfileCalculatorDeps,
): Promise<PrototypePPEntry | { reason: string } | null> {
    const [beatmapOutcome, ...calculationOutcomes] = await Promise.all([
        deps.getBeatmapByHash(score.hash),
        ...variants.map((name): Promise<CalculationOutcome> => {
            const state = reusable?.states.get(name);

            return state
                ? Promise.resolve({ kind: "reused", state })
                : deps.getOnlineScore(uid, score.hash, name, actingUid);
        }),
    ]);

    if (beatmapOutcome.kind === "error") {
        return { reason: beatmapOutcome.reason };
    }

    if (beatmapOutcome.kind === "skip") {
        return null;
    }

    const states: ScorePrototypeState[] = [];
    let values: ScoreValues | null = null;

    for (const outcome of calculationOutcomes) {
        if (outcome.kind === "error") {
            return { reason: outcome.reason };
        }

        if (outcome.kind === "skip") {
            return null;
        }

        if (outcome.kind === "reused") {
            states.push(outcome.state);

            continue;
        }

        // A score set since the scores were listed would mix calculations of two scores in one entry.
        if (outcome.response.score.id !== score.id) {
            return { reason: "Score changed during calculation" };
        }

        states.push(toState(outcome.response.calculation));
        values ??= getScoreValues(outcome.response);
    }

    // Every calculation was reused, so the stored entry has the values.
    values ??= reusable!.entry;

    const beatmap = MapInfo.from(beatmapOutcome.beatmap);
    const [live, local, master] = states;

    const beatmapDifficulty = new BeatmapDifficulty();
    beatmapDifficulty.cs = beatmap.cs;
    beatmapDifficulty.ar = beatmap.ar;
    beatmapDifficulty.od = beatmap.od;
    beatmapDifficulty.hp = beatmap.hp;

    ModUtil.applyModsToBeatmapDifficulty(
        beatmapDifficulty,
        Modes.Droid,
        ModUtil.deserializeMods(values.mods),
        true,
    );

    return {
        uid: uid,
        scoreId: score.id,
        hash: beatmap.hash,
        beatmapId: beatmap.beatmapId,
        title: beatmap.fullTitle,
        circleSize: beatmapDifficulty.cs,
        approachRate: beatmapDifficulty.ar,
        overallDifficulty: beatmapDifficulty.od,
        accuracy: values.accuracy,
        combo: values.combo,
        maxCombo: values.maxCombo,
        mods: values.mods,
        hit300: values.hit300,
        hit100: values.hit100,
        hit50: values.hit50,
        miss: values.miss,
        live,
        local,
        ...(master && { master }),
    } as PrototypePPEntry;
}
