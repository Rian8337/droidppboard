import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrokerClient } from "./BrokerClient";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function lastRequest(): { url: string; init: RequestInit } {
    const [url, init] = fetchMock.mock.lastCall as [string, RequestInit];

    return { url, init };
}

function headersOf(init: RequestInit): Headers {
    return new Headers(init.headers);
}

describe("BrokerClient", () => {
    beforeEach(() => {
        vi.stubEnv("DPP_BROKER_URL", "http://broker.test/");
        vi.stubEnv("DPP_BROKER_KEY", "test-key");
        vi.stubGlobal("fetch", fetchMock);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("sends X-Acting-Uid only when acting for a person", async () => {
        fetchMock.mockImplementation(() => Promise.resolve(jsonResponse([])));

        await BrokerClient.getVariants();

        let request = lastRequest();
        expect(request.url).toBe("http://broker.test/variants");
        expect(headersOf(request.init).get("X-Api-Key")).toBe("test-key");
        expect(headersOf(request.init).has("X-Acting-Uid")).toBe(false);

        await BrokerClient.getVariants(1234);

        request = lastRequest();
        expect(headersOf(request.init).get("X-Acting-Uid")).toBe("1234");
    });

    it("returns null when the variant list cannot be fetched", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
        expect(await BrokerClient.getVariants()).toBeNull();

        fetchMock.mockRejectedValueOnce(new Error("connection refused"));
        expect(await BrokerClient.getVariants()).toBeNull();
    });

    it("returns null when the acting user cannot be fetched", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({}, 404));
        expect(await BrokerClient.getMe(1)).toBeNull();

        fetchMock.mockRejectedValueOnce(new Error("connection refused"));
        expect(await BrokerClient.getMe(1)).toBeNull();
    });

    it("fetches the acting user", async () => {
        const me = { uid: 7, role: "manager", grants: ["droid-live"] };
        fetchMock.mockResolvedValueOnce(jsonResponse(me));

        expect(await BrokerClient.getMe(7)).toEqual(me);

        const request = lastRequest();
        expect(request.url).toBe("http://broker.test/me");
        expect(headersOf(request.init).get("X-Acting-Uid")).toBe("7");
    });

    it("fetches one variant, encoding the name and acting for the person", async () => {
        const variant = { name: "a b/c", healthyInstanceCount: 2 };
        fetchMock.mockResolvedValueOnce(jsonResponse(variant));

        expect(await BrokerClient.getVariant("a b/c", 9)).toEqual(variant);

        const { url, init } = lastRequest();
        expect(url).toBe("http://broker.test/variants/a%20b%2Fc");
        expect(headersOf(init).get("X-Acting-Uid")).toBe("9");

        await BrokerClient.getVariant("droid-live");
        expect(headersOf(lastRequest().init).has("X-Acting-Uid")).toBe(false);
    });

    it("returns null, and logs neither the key nor the URL, when a variant cannot be fetched", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({}, 404));
        expect(await BrokerClient.getVariant("x", 1)).toBeNull();

        fetchMock.mockRejectedValueOnce(
            new Error("failed http://broker.test/variants/x with test-key"),
        );
        expect(await BrokerClient.getVariant("x", 1)).toBeNull();

        // A name that cannot be encoded must not throw either.
        expect(await BrokerClient.getVariant("\ud800", 1)).toBeNull();

        vi.stubEnv("DPP_BROKER_URL", "");
        vi.stubGlobal("fetch", () => {
            throw new Error("bad url test-key");
        });
        expect(await BrokerClient.getVariant("x", 1)).toBeNull();

        const logged = JSON.stringify(
            vi.mocked(console.error).mock.calls.map((c) => c.map(String)),
        );
        expect(logged).not.toContain("test-key");
        expect(logged).not.toContain("broker.test");
    });

    it("forwards admin requests with method, path, and body", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ created: true }, 201));

        const result = await BrokerClient.forwardAdmin(
            "POST",
            "/variants",
            42,
            { name: "abc" },
        );

        expect(result).toEqual({ status: 201, body: { created: true } });

        const { url, init } = lastRequest();
        expect(url).toBe("http://broker.test/admin/variants");
        expect(init.method).toBe("POST");
        expect(init.body).toBe(JSON.stringify({ name: "abc" }));

        const headers = headersOf(init);
        expect(headers.get("X-Acting-Uid")).toBe("42");
        expect(headers.get("X-Api-Key")).toBe("test-key");
        expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("sends no content type when forwarding without a body", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse([]));

        await BrokerClient.forwardAdmin("GET", "/variants", 42);

        const { init } = lastRequest();
        expect(init.body).toBeUndefined();
        expect(headersOf(init).has("Content-Type")).toBe(false);
    });

    it("passes broker error statuses and bodies through", async () => {
        const body = { error: { code: "FORBIDDEN", message: "No" } };
        fetchMock.mockResolvedValueOnce(jsonResponse(body, 403));

        expect(await BrokerClient.forwardAdmin("GET", "/x", 1)).toEqual({
            status: 403,
            body,
        });
    });

    it("returns a null body for empty responses", async () => {
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

        expect(await BrokerClient.forwardAdmin("DELETE", "/x", 1)).toEqual({
            status: 204,
            body: null,
        });
    });

    it("answers 502 when the broker is unreachable", async () => {
        const unavailable = {
            status: 502,
            body: {
                error: {
                    code: "BROKER_UNAVAILABLE",
                    message: "The rework service is unavailable",
                },
            },
        };

        fetchMock.mockRejectedValueOnce(new Error("connection refused"));
        expect(await BrokerClient.forwardAdmin("GET", "/x", 1)).toEqual(
            unavailable,
        );

        fetchMock.mockResolvedValueOnce(
            new Response("<html>bad gateway</html>", { status: 200 }),
        );
        expect(await BrokerClient.forwardAdmin("GET", "/x", 1)).toEqual(
            unavailable,
        );
    });

    it.each([
        "/%2e%2e/me",
        "/%2E%2E/me",
        "/.%2e/me",
        "/%2e./me",
        "/%2e%2e\\me",
        "/x/%2e%2e/%2e%2e/me",
        "/%2e%2e",
        "/../me",
        "/variants/foo..bar",
        "variants",
        "",
        "/",
        "/variants/",
        "/variants?x=1",
        "/variants#x",
        "//evil.test/x",
    ])("rejects the admin path %j", async (path) => {
        await expect(
            BrokerClient.forwardAdmin("GET", path, 1),
        ).rejects.toThrow();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(["/variants", "/variants/droid-live/grants/123", "/a_b-c/1"])(
        "validates the admin path %s",
        (path) => {
            expect(BrokerClient.isValidAdminPath(path)).toBe(true);
        },
    );

    it.each(["", "/", "variants", "/a.b", "/a//b", "/a/", "/a?b", "/%2e%2e"])(
        "invalidates the admin path %j",
        (path) => {
            expect(BrokerClient.isValidAdminPath(path)).toBe(false);
        },
    );

    it.each([
        [
            "/variants/droid-live/grants/123",
            "/admin/variants/droid-live/grants/123",
        ],
        ["/keys/board/revoke", "/admin/keys/board/revoke"],
    ])("accepts the admin path %s", async (path, expected) => {
        fetchMock.mockResolvedValueOnce(jsonResponse({}));

        await BrokerClient.forwardAdmin("POST", path, 1);

        expect(lastRequest().url).toBe(`http://broker.test${expected}`);
    });

    it("does not log the response text when the body is not JSON", async () => {
        const errorSpy = vi.mocked(console.error);
        fetchMock.mockResolvedValueOnce(
            new Response("secret-description", { status: 200 }),
        );

        await BrokerClient.forwardAdmin("GET", "/x", 1);

        expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
            "secret-description",
        );
    });
});
