import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScoreServiceClient } from "./ScoreServiceClient";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function errorResponse(status: number, code: string): Response {
    return jsonResponse({ error: { code, message: "message" } }, status);
}

const okBody = {
    score: { mods: [] },
    calculation: { difficulty: {}, performance: {}, score: {} },
};

describe("ScoreServiceClient", () => {
    beforeEach(() => {
        vi.stubEnv("DPP_SCORE_SERVICE_URL", "http://scores.test/");
        vi.stubEnv("DPP_SCORE_SERVICE_KEY", "score-key");
        vi.stubGlobal("fetch", fetchMock);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("sends the acting uid and api key", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(okBody));

        const outcome = await ScoreServiceClient.getOnlineScore(
            12,
            "ABCDEF",
            "droid-live",
            34,
        );

        expect(outcome).toEqual({ kind: "ok", response: okBody });

        const [url, init] = fetchMock.mock.lastCall as [string, RequestInit];
        const parsed = new URL(url);
        const headers = new Headers(init.headers);

        expect(parsed.origin + parsed.pathname).toBe(
            "http://scores.test/online-scores",
        );
        expect(Object.fromEntries(parsed.searchParams)).toEqual({
            uid: "12",
            hash: "abcdef",
            variant: "droid-live",
            best: "true",
        });
        expect(headers.get("X-Api-Key")).toBe("score-key");
        expect(headers.get("X-Acting-Uid")).toBe("34");
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it.each(["SCORE_NOT_FOUND", "BEATMAP_NOT_FOUND"])(
        "maps %s to skip",
        async (code) => {
            fetchMock.mockResolvedValueOnce(errorResponse(404, code));

            const outcome = await ScoreServiceClient.getOnlineScore(
                1,
                "hash",
                "droid-live",
                2,
            );

            expect(outcome.kind).toBe("skip");
        },
    );

    it.each([
        ["a 500", () => errorResponse(500, "INTERNAL")],
        ["a 503", () => errorResponse(503, "UNAVAILABLE")],
        ["a 429", () => errorResponse(429, "RATE_LIMITED")],
        ["VARIANT_NOT_FOUND", () => errorResponse(404, "VARIANT_NOT_FOUND")],
        ["an unreadable body", () => new Response("<html>", { status: 502 })],
        ["an unreadable success body", () => new Response("nope")],
    ])("maps %s to error", async (_name, response) => {
        fetchMock.mockResolvedValueOnce(response());

        const outcome = await ScoreServiceClient.getOnlineScore(
            1,
            "hash",
            "droid-live",
            2,
        );

        expect(outcome.kind).toBe("error");
    });

    it("maps network errors to error", async () => {
        fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

        const outcome = await ScoreServiceClient.getOnlineScore(
            1,
            "hash",
            "droid-live",
            2,
        );

        expect(outcome.kind).toBe("error");
    });

    it("treats a timeout as an upstream error", async () => {
        fetchMock.mockRejectedValueOnce(
            new DOMException("The operation timed out", "TimeoutError"),
        );

        const outcome = await ScoreServiceClient.getOnlineScore(
            1,
            "hash",
            "droid-live",
            2,
        );

        expect(outcome.kind).toBe("error");
    });
});
