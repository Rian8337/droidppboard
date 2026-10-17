import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

describe("verifyTurnstile", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
        vi.stubGlobal("fetch", fetchMock);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    async function load() {
        return (await import("./Turnstile")).verifyTurnstile;
    }

    it("accepts a successful verification", async () => {
        fetchMock.mockResolvedValue(jsonResponse({ success: true }));

        const verifyTurnstile = await load();

        expect(await verifyTurnstile("token-1", "1.2.3.4")).toBe(true);

        const [url, init] = fetchMock.mock.lastCall as [string, RequestInit];

        expect(url).toBe(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        );
        expect(init.method).toBe("POST");
        expect(init.signal).toBeInstanceOf(AbortSignal);

        const body = new URLSearchParams(init.body as string);

        expect(body.get("secret")).toBe("test-secret");
        expect(body.get("response")).toBe("token-1");
        expect(body.get("remoteip")).toBe("1.2.3.4");
        expect(new Headers(init.headers).get("Content-Type")).toBe(
            "application/x-www-form-urlencoded",
        );
    });

    it("rejects on failure or network error", async () => {
        const verifyTurnstile = await load();

        fetchMock.mockResolvedValueOnce(
            jsonResponse({ success: false, "error-codes": ["bad"] }),
        );
        expect(await verifyTurnstile("token", "1.2.3.4")).toBe(false);

        fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
        expect(await verifyTurnstile("token", "1.2.3.4")).toBe(false);

        fetchMock.mockResolvedValueOnce(new Response("not json"));
        expect(await verifyTurnstile("token", "1.2.3.4")).toBe(false);

        fetchMock.mockRejectedValueOnce(new Error("network down"));
        expect(await verifyTurnstile("token", "1.2.3.4")).toBe(false);
    });

    it("rejects without calling Cloudflare when the secret is unset", async () => {
        vi.stubEnv("TURNSTILE_SECRET_KEY", "");

        const verifyTurnstile = await load();

        expect(await verifyTurnstile("token", "1.2.3.4")).toBe(false);
        expect(await verifyTurnstile("token", "1.2.3.4")).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledTimes(1);
    });
});
