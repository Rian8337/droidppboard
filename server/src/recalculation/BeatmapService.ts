import { OsuAPIResponse } from "@rian8337/osu-base";

/**
 * The outcome of looking up a beatmap.
 *
 * - `ok`: the beatmap was found.
 * - `skip`: osu! definitely has no such beatmap.
 * - `error`: the beatmap service could not answer, so nothing is known about the beatmap.
 */
export type BeatmapOutcome =
    | { kind: "ok"; beatmap: OsuAPIResponse }
    | { kind: "skip" }
    | { kind: "error"; reason: string };

/**
 * Gets a beatmap's information from the beatmap service.
 *
 * Only a `404` means that the beatmap does not exist. The service answers `503` while osu! is unavailable, `429`
 * when the key's limit is hit, `400` for a bad reference, and `500` on failure, all of which are errors.
 *
 * @param hash The MD5 hash of the beatmap.
 * @returns The outcome.
 */
export async function getBeatmapByHash(hash: string): Promise<BeatmapOutcome> {
    const url = new URL("http://localhost:3017/api/beatmap/getbeatmap");

    url.searchParams.set("key", process.env.DROID_SERVER_INTERNAL_KEY!);
    url.searchParams.set("hash", hash.toLowerCase());

    try {
        const response = await fetch(url.href);

        if (response.status === 200) {
            return {
                kind: "ok",
                beatmap: (await response.json()) as OsuAPIResponse,
            };
        }

        if (response.status === 404) {
            return { kind: "skip" };
        }

        return {
            kind: "error",
            reason: `Beatmap service returned ${response.status.toString()}`,
        };
    } catch (e) {
        // Only the error's name is logged, as the message can embed the request's URL, which holds the key.
        console.error(
            `Beatmap service request failed: ${e instanceof Error ? e.name : "unknown error"}`,
        );

        return { kind: "error", reason: "Beatmap service request failed" };
    }
}
