import { OsuAPIResponse, SerializedMod } from "@rian8337/osu-base";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeatmapOutcome } from "./BeatmapService";
import { calculateProfile, ProfileCalculatorDeps } from "./ProfileCalculator";
import { ReusableProfile, UnfinishedProfiles } from "./ReusableCalculations";
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

/**
 * The ID of the score on a beatmap, as the score service and the official database answer.
 */
function idOf(hash: string): number {
    return hash.charCodeAt(0);
}

function scores(...hashes: string[]) {
    return hashes.map((hash) => ({ id: idOf(hash), hash }));
}

function response(
    hash: string,
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
        score: { id: idOf(hash), mods },
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

function ok(
    hash: string,
    total: number,
    mods?: SerializedMod[],
): OnlineScoreOutcome {
    return { kind: "ok", response: response(hash, total, mods) };
}

function createDeps(
    overrides: Partial<ProfileCalculatorDeps> = {},
): ProfileCalculatorDeps & {
    [K in Exclude<
        keyof ProfileCalculatorDeps,
        "unfinishedProfiles"
    >]: ReturnType<typeof vi.fn>;
} {
    return {
        findPlayer: vi
            .fn()
            .mockResolvedValue({ id: 7, username: "Player", archived: false }),
        getTopScores: vi.fn().mockResolvedValue(scores("a", "b", "c")),
        getBeatmapByHash: vi.fn(async (hash: string) => ({
            kind: "ok" as const,
            beatmap: beatmap(hash),
        })),
        // Live pays 100, the calculated variant 200 and master 150, so that totals tell them apart.
        getOnlineScore: vi.fn(
            async (
                _uid: number,
                hash: string,
                variant: string,
            ): Promise<OnlineScoreOutcome> =>
                ok(
                    hash,
                    variant === "droid-live"
                        ? 100
                        : variant === "droid-rebalance"
                          ? 150
                          : 200,
                ),
        ),
        getBuiltAt: vi.fn(async (variant: string) => `${variant}-build`),
        getReusableProfiles: vi.fn().mockResolvedValue([]),
        saveProfile: vi.fn().mockResolvedValue(undefined),
        unfinishedProfiles: new UnfinishedProfiles(),
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
            getTopScores: vi.fn().mockRejectedValue(new Error("boom")),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome).toEqual({ ok: false, reason: "Unexpected error" });
        expect(deps.saveProfile).not.toHaveBeenCalled();
    });

    it("fails when there are no top scores", async () => {
        const deps = createDeps({
            getTopScores: vi.fn().mockResolvedValue(scores()),
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
            getTopScores: vi.fn().mockResolvedValue(scores("a", "b", "c", "d")),
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
                        : ok(hash, variant === "droid-live" ? 100 : 200),
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
            getTopScores: vi.fn().mockResolvedValue(scores("a")),
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
            getTopScores: vi.fn().mockResolvedValue(scores("a")),
            getOnlineScore: vi.fn(
                async (
                    _uid: number,
                    hash: string,
                    variant: string,
                ): Promise<OnlineScoreOutcome> =>
                    ok(
                        hash,
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
                    : ok(hash, 100),
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
            getTopScores: vi.fn().mockRejectedValue(new Error("db down")),
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
            getTopScores: vi.fn().mockResolvedValue(scores("a")),
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
            getTopScores: vi.fn().mockResolvedValue(scores("a", "b")),
            getOnlineScore: vi.fn(
                async (
                    _uid: number,
                    hash: string,
                    variant: string,
                ): Promise<OnlineScoreOutcome> =>
                    ok(
                        hash,
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
            getTopScores: vi.fn().mockResolvedValue(scores("a")),
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
            getTopScores: vi.fn().mockResolvedValue(scores("a", "b")),
            getOnlineScore: vi.fn(
                (_uid: number, hash: string, variant: string) =>
                    new Promise<OnlineScoreOutcome>((resolve) => {
                        pending.push(() => {
                            resolve(
                                ok(hash, variant === "droid-live" ? 100 : 200),
                            );
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
            getTopScores: vi.fn().mockResolvedValue(scores("a", "b")),
            getOnlineScore: vi.fn(
                async (
                    _uid: number,
                    hash: string,
                    variant: string,
                ): Promise<OnlineScoreOutcome> => {
                    if (hash !== "a") {
                        return ok(hash, 100);
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
            getTopScores: vi.fn().mockResolvedValue(scores("a", "b")),
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
                        : ok(hash, 100),
            ),
        });

        const outcome = await calculateProfile(7, "variant", 1, vi.fn(), deps);

        expect(outcome.ok).toBe(true);
    });

    it("reports progress per processed score", async () => {
        const deps = createDeps({
            getTopScores: vi.fn().mockResolvedValue(scores("a", "b", "c")),
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

    describe("reuse", () => {
        /**
         * Calculates a profile with the default services and gives what was saved, as a stored profile.
         */
        async function storeProfile(
            variant: string,
            hashes = ["a", "b"],
        ): Promise<ReusableProfile> {
            const deps = createDeps({
                getTopScores: vi.fn().mockResolvedValue(scores(...hashes)),
            });

            await calculateProfile(7, variant, 1, vi.fn(), deps);

            const { pp, calculatorBuilds } = deps.saveProfile.mock.calls[0][2];

            return { reworkType: variant, pp, calculatorBuilds };
        }

        function calledVariants(deps: ReturnType<typeof createDeps>) {
            return deps.getOnlineScore.mock.calls.map(([, hash, variant]) => [
                hash,
                variant,
            ]);
        }

        it("saves the score IDs and the builds", async () => {
            const deps = createDeps({
                getTopScores: vi.fn().mockResolvedValue(scores("a")),
            });

            await calculateProfile(7, "experiment", 1, vi.fn(), deps);

            const profile = deps.saveProfile.mock.calls[0][2];

            expect(profile.pp[0].scoreId).toBe(idOf("a"));
            expect(profile.calculatorBuilds).toEqual({
                "droid-live": "droid-live-build",
                experiment: "experiment-build",
                "droid-rebalance": "droid-rebalance-build",
            });
        });

        it("calculates only the variants whose stored calculations are not current", async () => {
            const stored = await storeProfile("experiment");
            const deps = createDeps({
                getTopScores: vi.fn().mockResolvedValue(scores("a", "b")),
                getReusableProfiles: vi.fn().mockResolvedValue([stored]),
                getBuiltAt: vi.fn(async (variant: string) =>
                    variant === "experiment"
                        ? "experiment-rebuild"
                        : `${variant}-build`,
                ),
            });

            const outcome = await calculateProfile(
                7,
                "experiment",
                1,
                vi.fn(),
                deps,
            );

            expect(outcome.ok).toBe(true);
            expect(calledVariants(deps)).toEqual([
                ["a", "experiment"],
                ["b", "experiment"],
            ]);
            expect(deps.saveProfile.mock.calls[0][2].pp[0]).toMatchObject({
                live: stored.pp[0].live,
                master: stored.pp[0].master,
            });
        });

        it("reuses calculations from the player's profiles in other variants", async () => {
            const master = await storeProfile("droid-rebalance");
            const deps = createDeps({
                getTopScores: vi.fn().mockResolvedValue(scores("a", "b")),
                getReusableProfiles: vi.fn().mockResolvedValue([master]),
            });

            await calculateProfile(7, "experiment", 1, vi.fn(), deps);

            // The master profile holds both live and master as its local.
            expect(calledVariants(deps)).toEqual([
                ["a", "experiment"],
                ["b", "experiment"],
            ]);

            const entry = deps.saveProfile.mock.calls[0][2].pp[0];

            expect(entry.master).toEqual(master.pp[0].local);
            expect(entry.live).toEqual(master.pp[0].live);
        });

        it("builds an entry from the stored one when every calculation is current", async () => {
            const stored = await storeProfile("experiment", ["a"]);
            const deps = createDeps({
                getTopScores: vi.fn().mockResolvedValue(scores("a")),
                getReusableProfiles: vi.fn().mockResolvedValue([stored]),
            });

            const outcome = await calculateProfile(
                7,
                "experiment",
                1,
                vi.fn(),
                deps,
            );

            expect(outcome.ok).toBe(true);
            expect(deps.getOnlineScore).not.toHaveBeenCalled();
            // The beatmap is still looked up, as it may have been updated or removed since.
            expect(deps.getBeatmapByHash).toHaveBeenCalledWith("a");
            expect(deps.saveProfile.mock.calls[0][2].pp).toEqual(stored.pp);
        });

        it("calculates a score again when the player's best score on the beatmap changed", async () => {
            const stored = await storeProfile("experiment", ["a"]);
            const deps = createDeps({
                getTopScores: vi
                    .fn()
                    .mockResolvedValue([{ id: 999, hash: "a" }]),
                getReusableProfiles: vi.fn().mockResolvedValue([stored]),
                getOnlineScore: vi.fn(
                    async (): Promise<OnlineScoreOutcome> => ({
                        kind: "ok",
                        response: {
                            ...response("a", 100),
                            score: { id: 999, mods: [] },
                        },
                    }),
                ),
            });

            await calculateProfile(7, "experiment", 1, vi.fn(), deps);

            expect(deps.getOnlineScore).toHaveBeenCalledTimes(3);
            expect(deps.saveProfile.mock.calls[0][2].pp[0].scoreId).toBe(999);
        });

        it("does not reuse calculations of a variant whose build cannot be told", async () => {
            const stored = await storeProfile("experiment", ["a"]);
            const deps = createDeps({
                getTopScores: vi.fn().mockResolvedValue(scores("a")),
                getReusableProfiles: vi.fn().mockResolvedValue([stored]),
                getBuiltAt: vi.fn(async (variant: string) => {
                    if (variant === "droid-live") {
                        throw new Error("broker down");
                    }

                    return variant === "experiment" ? null : `${variant}-build`;
                }),
            });

            const outcome = await calculateProfile(
                7,
                "experiment",
                1,
                vi.fn(),
                deps,
            );

            expect(outcome.ok).toBe(true);
            expect(calledVariants(deps)).toEqual([
                ["a", "droid-live"],
                ["a", "experiment"],
            ]);
            expect(deps.saveProfile.mock.calls[0][2].calculatorBuilds).toEqual({
                "droid-rebalance": "droid-rebalance-build",
            });
        });

        it("does not record a build that changed during the calculation", async () => {
            let experimentBuild = "experiment-build";
            const deps = createDeps({
                getTopScores: vi.fn().mockResolvedValue(scores("a")),
                getBuiltAt: vi.fn(async (variant: string) =>
                    variant === "experiment"
                        ? experimentBuild
                        : `${variant}-build`,
                ),
                getOnlineScore: vi.fn(
                    async (
                        _uid: number,
                        hash: string,
                    ): Promise<OnlineScoreOutcome> => {
                        experimentBuild = "experiment-rebuild";

                        return ok(hash, 100);
                    },
                ),
            });

            await calculateProfile(7, "experiment", 1, vi.fn(), deps);

            expect(
                deps.saveProfile.mock.calls[0][2].calculatorBuilds,
            ).not.toHaveProperty("experiment");
        });

        it("does not calculate again the scores that a failed attempt finished", async () => {
            let failing = true;
            const deps = createDeps({
                getOnlineScore: vi.fn(
                    async (
                        _uid: number,
                        hash: string,
                    ): Promise<OnlineScoreOutcome> =>
                        failing && hash === "c"
                            ? {
                                  kind: "error",
                                  reason: "Score service returned 503",
                              }
                            : ok(hash, 100),
                ),
            });

            const failed = await calculateProfile(
                7,
                "experiment",
                1,
                vi.fn(),
                deps,
            );

            expect(failed.ok).toBe(false);

            failing = false;
            deps.getOnlineScore.mockClear();

            const retried = await calculateProfile(
                7,
                "experiment",
                1,
                vi.fn(),
                deps,
            );

            expect(retried.ok).toBe(true);
            expect(new Set(calledVariants(deps).map(([hash]) => hash))).toEqual(
                new Set(["c"]),
            );
            expect(deps.saveProfile.mock.calls[0][2].pp).toHaveLength(3);
            expect(
                deps.unfinishedProfiles.get(7, "experiment"),
            ).toBeUndefined();
        });

        it("fails when the score service calculated another score than the one listed", async () => {
            const deps = createDeps({
                getTopScores: vi.fn().mockResolvedValue([{ id: 1, hash: "a" }]),
            });

            const outcome = await calculateProfile(
                7,
                "experiment",
                1,
                vi.fn(),
                deps,
            );

            expect(outcome).toEqual({
                ok: false,
                reason: "Score changed during calculation",
            });
        });
    });
});
