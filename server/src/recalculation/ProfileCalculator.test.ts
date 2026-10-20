import { OsuAPIResponse, SerializedMod } from "@rian8337/osu-base";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeatmapOutcome } from "./BeatmapService";
import { calculateProfile, ProfileCalculatorDeps } from "./ProfileCalculator";
import { OnlineScoreOutcome, OnlineScoreResponse } from "./ScoreServiceClient";

function beatmap(hash: string): OsuAPIResponse {
    return {
        approved: "1",
        submit_date: "2020-01-02 03:04:05",
        approved_date: "2020-02-02 03:04:05",
        last_update: "2020-01-03 03:04:05",
        artist: "Artist",
        beatmap_id: "1",
        beatmapset_id: "2",
        bpm: "180",
        creator: "Creator",
        creator_id: "3",
        difficultyrating: "5",
        diff_aim: null,
        diff_speed: null,
        diff_size: "4",
        diff_overall: "8",
        diff_approach: "9",
        diff_drain: "5",
        hit_length: "100",
        source: "",
        genre_id: "1",
        language_id: "1",
        title: `Title ${hash}`,
        total_length: "110",
        version: "Insane",
        file_md5: hash,
        mode: "0",
        tags: "",
        favourite_count: "0",
        rating: "0",
        playcount: "0",
        passcount: "0",
        count_normal: "100",
        count_slider: "50",
        count_spinner: "1",
        max_combo: "500",
        storyboard: "0",
        video: "0",
        download_unavailable: "0",
        audio_unavailable: "0",
        packs: null,
    };
}

function response(
    total: number,
    mods: SerializedMod[] = [],
): OnlineScoreResponse {
    const performance = {
        total,
        aim: total / 2,
        tap: total / 4,
        accuracy: total / 8,
        flashlight: 0,
        reading: 1,
        deviation: 10,
        tapDeviation: 12,
        tapPenalty: 1,
    };

    return {
        score: { mods },
        calculation: {
            difficulty: {
                starRating: 5,
                aimDifficulty: 2,
                tapDifficulty: 3,
                rhythmDifficulty: 1,
                flashlightDifficulty: 0,
                readingDifficulty: 1.5,
                speedNoteCount: 100,
                maxCombo: 500,
                mods: [],
            },
            performance,
            score: {
                n300: 90,
                n100: 8,
                n50: 1,
                nmiss: 1,
                combo: 400,
                tapPenalty: 1,
                sliderCheesePenalty: 1,
            },
        },
    } as unknown as OnlineScoreResponse;
}

function ok(total: number, mods?: SerializedMod[]): OnlineScoreOutcome {
    return { kind: "ok", response: response(total, mods) };
}

function createDeps(
    overrides: Partial<ProfileCalculatorDeps> = {},
): ProfileCalculatorDeps & {
    [K in keyof ProfileCalculatorDeps]: ReturnType<typeof vi.fn>;
} {
    return {
        findPlayer: vi
            .fn()
            .mockResolvedValue({ id: 7, username: "Player", archived: false }),
        getTopScoreHashes: vi.fn().mockResolvedValue(["a", "b", "c"]),
        getBeatmapByHash: vi.fn(async (hash: string) => ({
            kind: "ok" as const,
            beatmap: beatmap(hash),
        })),
        // Live pays 100, the calculated variant 200 and master 150, so that totals tell them apart.
        getOnlineScore: vi.fn(
            async (
                _uid: number,
                _hash: string,
                variant: string,
            ): Promise<OnlineScoreOutcome> =>
                ok(
                    variant === "droid-live"
                        ? 100
                        : variant === "droid-rebalance"
                          ? 150
                          : 200,
                ),
        ),
        saveProfile: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    } as never;
}

describe("calculateProfile", () => {
    beforeEach(() => {
        vi.spyOn(console, "info").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("fails when the player is not found", async () => {
        const deps = createDeps({
            findPlayer: vi.fn().mockResolvedValue(null),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome).toEqual({ ok: false, reason: "Player not found" });
        expect(deps.saveProfile).not.toHaveBeenCalled();
    });

    it("fails with the queue's reason when a service throws", async () => {
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockRejectedValue(new Error("boom")),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome).toEqual({ ok: false, reason: "Unexpected error" });
        expect(deps.saveProfile).not.toHaveBeenCalled();
    });

    it("fails when there are no top scores", async () => {
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue([]),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome).toEqual({
            ok: false,
            reason: "Failed to fetch top scores",
        });
        expect(deps.saveProfile).not.toHaveBeenCalled();
    });

    it("skips scores whose beatmap or score is not found and saves the rest", async () => {
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue(["a", "b", "c", "d"]),
            getBeatmapByHash: vi.fn(async (hash: string) =>
                hash === "a"
                    ? { kind: "skip" as const }
                    : { kind: "ok" as const, beatmap: beatmap(hash) },
            ),
            getOnlineScore: vi.fn(
                async (
                    _uid: number,
                    hash: string,
                    variant: string,
                ): Promise<OnlineScoreOutcome> =>
                    hash === "b" && variant === "variant"
                        ? { kind: "skip", reason: "SCORE_NOT_FOUND" }
                        : ok(variant === "droid-live" ? 100 : 200),
            ),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        // Only "c" and "d" remain.
        expect(outcome).toEqual({
            ok: true,
            livePPTotal: 100 + 100 * 0.95,
            localPPTotal: 200 + 200 * 0.95,
        });
        expect(deps.saveProfile).toHaveBeenCalledTimes(1);

        const [uid, variant, profile] = deps.saveProfile.mock.calls[0];

        expect(uid).toBe(7);
        expect(variant).toBe("variant");
        expect(profile.username).toBe("Player");
        expect(profile.pp.map((e: { hash: string }) => e.hash)).toEqual([
            "c",
            "d",
        ]);
    });

    it("asks the score service with the score's own hash when the beatmap was updated", async () => {
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue(["a"]),
            // The beatmap service answers with the updated beatmap, whose file_md5 differs.
            getBeatmapByHash: vi.fn(async (hash: string) => ({
                kind: "ok" as const,
                beatmap: beatmap(`new-${hash}`),
            })),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome.ok).toBe(true);
        expect(
            deps.getOnlineScore.mock.calls.map(([, hash, variant]) => [
                hash,
                variant,
            ]),
        ).toEqual([
            ["a", "droid-live"],
            ["a", "variant"],
            ["a", "droid-rebalance"],
        ]);
        // The stored entry keeps the beatmap's own hash.
        expect(deps.saveProfile.mock.calls[0][2].pp[0].hash).toBe("new-a");
    });

    it("builds entries from the beatmap and the three calculations", async () => {
        const mods: SerializedMod[] = [{ acronym: "HR" }];
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue(["a"]),
            getOnlineScore: vi.fn(
                async (
                    _uid: number,
                    _hash: string,
                    variant: string,
                ): Promise<OnlineScoreOutcome> =>
                    ok(
                        variant === "droid-live"
                            ? 100
                            : variant === "droid-rebalance"
                              ? 150
                              : 200,
                        mods,
                    ),
            ),
        });

        await calculateProfile(7, "variant", 1, vi.fn(), deps);

        const entry = deps.saveProfile.mock.calls[0][2].pp[0];

        expect(entry).toMatchObject({
            uid: 7,
            hash: "a",
            title: "Artist - Title a (Creator) [Insane]",
            // HR raises CS by 30% and AR and OD by 40%, capped at 10.
            circleSize: expect.closeTo(5.2),
            approachRate: 10,
            overallDifficulty: expect.closeTo(10),
            combo: 400,
            maxCombo: 500,
            mods,
            hit300: 90,
            hit100: 8,
            hit50: 1,
            miss: 1,
        });
        expect(entry.accuracy).toBeCloseTo(
            ((90 * 300 + 8 * 100 + 50) / (100 * 300)) * 100,
        );
        expect(entry.live.performance).toMatchObject({
            total: 100,
            estimatedUnstableRate: 100,
            estimatedTapUnstableRate: 120,
            tapPenalty: 1,
        });
        expect(entry.live.difficulty).toEqual({
            starRating: 5,
            aim: 2,
            tap: 3,
            rhythm: 1,
            flashlight: 0,
            reading: 1.5,
            speedNoteCount: 100,
        });
        expect(entry.local.performance.total).toBe(200);
        expect(entry.master.performance.total).toBe(150);
    });

    it("fails the player without saving when any call errors", async () => {
        const getOnlineScore = vi.fn(
            async (
                _uid: number,
                hash: string,
                variant: string,
            ): Promise<OnlineScoreOutcome> =>
                hash === "c" && variant === "droid-live"
                    ? { kind: "error", reason: "Score service returned 503" }
                    : ok(100),
        );
        const deps = createDeps({ getOnlineScore });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome).toEqual({
            ok: false,
            reason: "Score service returned 503",
        });
        expect(deps.saveProfile).not.toHaveBeenCalled();
    });

    it("fails the player when the beatmap service errors", async () => {
        const deps = createDeps({
            getBeatmapByHash: vi.fn().mockResolvedValue({
                kind: "error",
                reason: "Beatmap service returned 503",
            }),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome).toEqual({
            ok: false,
            reason: "Beatmap service returned 503",
        });
        expect(deps.saveProfile).not.toHaveBeenCalled();
    });

    it("fails when no scores could be calculated", async () => {
        const deps = createDeps({
            getBeatmapByHash: vi.fn().mockResolvedValue({ kind: "skip" }),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome).toEqual({
            ok: false,
            reason: "No scores could be calculated",
        });
        expect(deps.saveProfile).not.toHaveBeenCalled();
    });

    it("fails instead of throwing when a dependency throws", async () => {
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockRejectedValue(new Error("db down")),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome.ok).toBe(false);
        expect(deps.saveProfile).not.toHaveBeenCalled();
    });

    it("omits master when recalculating droid-rebalance", async () => {
        const deps = createDeps();

        const outcome = await calculateProfile(
            7,
            "droid-rebalance",
            1,
            vi.fn(),
            deps,
        );

        expect(outcome.ok).toBe(true);

        const variants = deps.getOnlineScore.mock.calls.map((c) => c[2]);

        expect(new Set(variants)).toEqual(
            new Set(["droid-live", "droid-rebalance"]),
        );
        expect(variants).toHaveLength(6);

        const profile = deps.saveProfile.mock.calls[0][2];

        expect(profile.masterPPTotal).toBeUndefined();
        expect(profile.pp[0].master).toBeUndefined();
    });

    it("calls live, local, and master for other variants", async () => {
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue(["a"]),
        });

        await calculateProfile(7, "experiment", 99, vi.fn(), deps);

        expect(deps.getOnlineScore.mock.calls).toEqual([
            [7, "a", "droid-live", 99],
            [7, "a", "experiment", 99],
            [7, "a", "droid-rebalance", 99],
        ]);

        const profile = deps.saveProfile.mock.calls[0][2];

        expect(profile.livePPTotal).toBe(100);
        expect(profile.localPPTotal).toBe(200);
        expect(profile.masterPPTotal).toBe(150);
    });

    it("sorts entries by local pp and weights each total on its own", async () => {
        const perHash: Record<string, [number, number]> = {
            a: [300, 10],
            b: [100, 50],
        };
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue(["a", "b"]),
            getOnlineScore: vi.fn(
                async (
                    _uid: number,
                    hash: string,
                    variant: string,
                ): Promise<OnlineScoreOutcome> =>
                    ok(
                        variant === "droid-live"
                            ? perHash[hash][0]
                            : perHash[hash][1],
                    ),
            ),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(
            deps.saveProfile.mock.calls[0][2].pp.map(
                (e: { hash: string }) => e.hash,
            ),
        ).toEqual(["b", "a"]);
        expect(outcome).toEqual({
            ok: true,
            livePPTotal: 300 + 100 * 0.95,
            localPPTotal: 50 + 10 * 0.95,
        });
    });

    it("looks up a score's beatmap and calculations at the same time", async () => {
        let releaseBeatmap!: () => void;
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue(["a"]),
            getBeatmapByHash: vi.fn(
                (hash: string) =>
                    new Promise<BeatmapOutcome>((resolve) => {
                        releaseBeatmap = () => {
                            resolve({ kind: "ok", beatmap: beatmap(hash) });
                        };
                    }),
            ),
        });

        const outcome = calculateProfile(7, "experiment", 1, vi.fn(), deps);

        await vi.waitFor(() => {
            expect(deps.getOnlineScore).toHaveBeenCalledTimes(3);
        });

        releaseBeatmap();

        expect((await outcome).ok).toBe(true);
    });

    it("starts a score only after the previous one is done", async () => {
        const pending: (() => void)[] = [];
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue(["a", "b"]),
            getOnlineScore: vi.fn(
                (_uid: number, _hash: string, variant: string) =>
                    new Promise<OnlineScoreOutcome>((resolve) => {
                        pending.push(() => {
                            resolve(ok(variant === "droid-live" ? 100 : 200));
                        });
                    }),
            ),
        });

        const outcome = calculateProfile(7, "experiment", 1, vi.fn(), deps);

        await vi.waitFor(() => {
            expect(pending).toHaveLength(3);
        });

        // The variant's calculator serves one score of a player at a time.
        expect(
            deps.getOnlineScore.mock.calls.every(([, hash]) => hash === "a"),
        ).toBe(true);

        pending.splice(0).forEach((release) => {
            release();
        });

        await vi.waitFor(() => {
            expect(pending).toHaveLength(3);
        });

        pending.splice(0).forEach((release) => {
            release();
        });

        expect((await outcome).ok).toBe(true);
    });

    it("skips a score whose live calculation is not found even when another call errors", async () => {
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue(["a", "b"]),
            getOnlineScore: vi.fn(
                async (
                    _uid: number,
                    hash: string,
                    variant: string,
                ): Promise<OnlineScoreOutcome> => {
                    if (hash !== "a") {
                        return ok(100);
                    }

                    return variant === "droid-live"
                        ? { kind: "skip", reason: "SCORE_NOT_FOUND" }
                        : {
                              kind: "error",
                              reason: "Score service returned 503",
                          };
                },
            ),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome.ok).toBe(true);
        expect(
            deps.saveProfile.mock.calls[0][2].pp.map(
                (e: { hash: string }) => e.hash,
            ),
        ).toEqual(["b"]);
    });

    it("skips a score whose beatmap is not found even when a calculation errors", async () => {
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue(["a", "b"]),
            getBeatmapByHash: vi.fn(async (hash: string) =>
                hash === "a"
                    ? { kind: "skip" as const }
                    : { kind: "ok" as const, beatmap: beatmap(hash) },
            ),
            getOnlineScore: vi.fn(
                async (
                    _uid: number,
                    hash: string,
                ): Promise<OnlineScoreOutcome> =>
                    hash === "a"
                        ? {
                              kind: "error",
                              reason: "Score service returned 503",
                          }
                        : ok(100),
            ),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome.ok).toBe(true);
    });

    it("reports progress per processed score", async () => {
        const deps = createDeps({
            getTopScoreHashes: vi.fn().mockResolvedValue(["a", "b", "c"]),
            getBeatmapByHash: vi.fn(async (hash: string) =>
                hash === "b"
                    ? { kind: "skip" as const }
                    : { kind: "ok" as const, beatmap: beatmap(hash) },
            ),
        });
        const onProgress = vi.fn();

        await calculateProfile(7, "variant", 1, onProgress, deps);

        expect(onProgress.mock.calls).toEqual([
            [1, 3],
            [2, 3],
            [3, 3],
        ]);
    });

    it("logs one line per player", async () => {
        const info = vi.spyOn(console, "info");

        await calculateProfile(7, "variant", 1, vi.fn(), createDeps());

        expect(info).toHaveBeenCalledTimes(1);
        expect(info.mock.calls[0][0]).toContain("uid=7");
        expect(info.mock.calls[0][0]).toContain("variant=variant");
    });
});
