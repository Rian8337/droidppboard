import {
    Accuracy,
    BeatmapDifficulty,
    MapInfo,
    Modes,
    ModUtil,
} from "@rian8337/osu-base";
import {
    IPrototypePP,
    PrototypePPEntry,
    ScorePrototypeState,
} from "app-structures";
import { OsuDroidAccounts } from "../auth/OsuDroidAccounts";
import { DatabaseManager } from "../database/managers/DatabaseManager";
import { getBeatmapByHash } from "./BeatmapService";
import { getTopScoreHashes } from "./OfficialScores";
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
    getTopScoreHashes: typeof getTopScoreHashes;
    getBeatmapByHash: typeof getBeatmapByHash;
    getOnlineScore: typeof ScoreServiceClient.getOnlineScore;
    saveProfile: (
        uid: number,
        reworkType: string,
        profile: Pick<
            IPrototypePP,
            "pp" | "localPPTotal" | "livePPTotal" | "masterPPTotal" | "username"
        >,
    ) => Promise<void>;
}

const liveVariant = "droid-live";
const masterVariant = "droid-rebalance";

const defaultDeps: ProfileCalculatorDeps = {
    findPlayer: (uidOrUsername) => OsuDroidAccounts.findPlayer(uidOrUsername),
    getTopScoreHashes,
    getBeatmapByHash,
    getOnlineScore: (...args) => ScoreServiceClient.getOnlineScore(...args),
    saveProfile: (uid, reworkType, profile) =>
        DatabaseManager.aliceDb.collections.prototypePP.saveProfile(
            uid,
            reworkType,
            profile,
        ),
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

    const hashes = await deps.getTopScoreHashes(uid);

    if (hashes.length === 0) {
        return { ok: false, reason: "Failed to fetch top scores" };
    }

    const includeMaster = variant !== masterVariant;
    const entries: PrototypePPEntry[] = [];

    for (let i = 0; i < hashes.length; ++i) {
        const hash = hashes[i];

        const beatmapOutcome = await deps.getBeatmapByHash(hash);

        if (beatmapOutcome.kind === "error") {
            return { ok: false, reason: beatmapOutcome.reason };
        }

        if (beatmapOutcome.kind === "ok") {
            const entry = await createEntry(
                uid,
                MapInfo.from(beatmapOutcome.beatmap),
                hash,
                variant,
                includeMaster,
                actingUid,
                deps,
            );

            if (entry !== null && "reason" in entry) {
                return { ok: false, reason: entry.reason };
            }

            if (entry !== null) {
                entries.push(entry);
            }
        }

        onProgress(i + 1, hashes.length);
    }

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

    await deps.saveProfile(uid, variant, {
        pp: entries,
        livePPTotal,
        localPPTotal,
        masterPPTotal,
        username: player.username,
    });

    return { ok: true, livePPTotal, localPPTotal };
}

/**
 * Calculates a score for the live, local, and (if asked) master variants.
 *
 * The score service finds the score by the hash it was set on, which differs from the beatmap's current hash when the
 * beatmap was updated since.
 *
 * @returns The entry, `null` if the score does not exist for one of the variants, or the reason for why a service
 * failed.
 */
async function createEntry(
    uid: number,
    beatmap: MapInfo,
    scoreHash: string,
    variant: string,
    includeMaster: boolean,
    actingUid: number,
    deps: ProfileCalculatorDeps,
): Promise<PrototypePPEntry | { reason: string } | null> {
    const calculations: OnlineScoreResponse[] = [];

    for (const name of includeMaster
        ? [liveVariant, variant, masterVariant]
        : [liveVariant, variant]) {
        const outcome = await deps.getOnlineScore(
            uid,
            scoreHash,
            name,
            actingUid,
        );

        if (outcome.kind === "error") {
            return { reason: outcome.reason };
        }

        if (outcome.kind === "skip") {
            return null;
        }

        calculations.push(outcome.response);
    }

    const [live, local, master] = calculations;
    const { score: liveScore, difficulty: liveDifficulty } = live.calculation;

    const beatmapDifficulty = new BeatmapDifficulty();
    beatmapDifficulty.cs = beatmap.cs;
    beatmapDifficulty.ar = beatmap.ar;
    beatmapDifficulty.od = beatmap.od;
    beatmapDifficulty.hp = beatmap.hp;

    ModUtil.applyModsToBeatmapDifficulty(
        beatmapDifficulty,
        Modes.Droid,
        ModUtil.deserializeMods(live.score.mods),
        true,
    );

    const accuracy = new Accuracy(liveScore);

    return {
        uid: uid,
        hash: beatmap.hash,
        title: beatmap.fullTitle,
        circleSize: beatmapDifficulty.cs,
        approachRate: beatmapDifficulty.ar,
        overallDifficulty: beatmapDifficulty.od,
        accuracy: accuracy.value() * 100,
        combo: liveScore.combo,
        maxCombo: liveDifficulty.maxCombo,
        // The difficulty attributes hold only the difficulty-adjusting mods, whereas the score has all of them.
        mods: live.score.mods,
        hit300: accuracy.n300,
        hit100: accuracy.n100,
        hit50: accuracy.n50,
        miss: accuracy.nmiss,
        live: toState(live.calculation),
        local: toState(local.calculation),
        ...(master && { master: toState(master.calculation) }),
    } as PrototypePPEntry;
}
