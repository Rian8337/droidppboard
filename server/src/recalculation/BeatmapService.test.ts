import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBeatmapByHash } from "./BeatmapService";

const fetchMock = vi.fn();

describe("getBeatmapByHash", () => {
    beforeEach(() => {
        vi.stubEnv("DROID_SERVER_INTERNAL_KEY", "internal-key");
        vi.stubGlobal("fetch", fetchMock);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("asks for the beatmap by lowercased hash with a timeout", async () => {
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ file_md5: "abc" })),
        );

        const outcome = await getBeatmapByHash("ABC");

        expect(outcome).toEqual({ kind: "ok", beatmap: { file_md5: "abc" } });

        const [url, init] = fetchMock.mock.lastCall as [string, RequestInit];
        const parsed = new URL(url);

        expect(parsed.origin + parsed.pathname).toBe(
            "http://localhost:3017/api/beatmap/getbeatmap",
        );
        expect(Object.fromEntries(parsed.searchParams)).toEqual({
            key: "internal-key",
            hash: "abc",
        });
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("maps 404 to skip", async () => {
        fetchMock.mockResolvedValueOnce(
            new Response(JSON.stringify({ error: "Beatmap not found" }), {
                status: 404,
            }),
        );

        expect(await getBeatmapByHash("abc")).toEqual({ kind: "skip" });
    });

    it.each([503, 429, 400, 500])("maps %i to error", async (status) => {
        fetchMock.mockResolvedValueOnce(new Response("{}", { status }));

        const outcome = await getBeatmapByHash("abc");

        expect(outcome).toEqual({
            kind: "error",
            reason: `Beatmap service returned ${status.toString()}`,
        });
    });

    it("maps network errors to error", async () => {
        fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

        expect((await getBeatmapByHash("abc")).kind).toBe("error");
    });

    it("treats a timeout as an upstream error", async () => {
        fetchMock.mockRejectedValueOnce(
            new DOMException("The operation timed out", "TimeoutError"),
        );

        expect(await getBeatmapByHash("abc")).toEqual({
            kind: "error",
            reason: "Beatmap service timed out",
        });
    });
});
