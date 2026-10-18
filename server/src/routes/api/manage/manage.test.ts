import express, { RequestHandler } from "express";
import { AddressInfo } from "net";
import { Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bodyParserErrorHandler } from "../../../utils/bodyParserErrorHandler";

const mocks = vi.hoisted(() => ({
    forwardAdmin: vi.fn(),
    getUsernames: vi.fn(),
    getMe: vi.fn(),
}));

vi.mock("../../../auth/OsuDroidAccounts", () => ({
    OsuDroidAccounts: { getUsernames: mocks.getUsernames },
}));
vi.mock("../../../clients/BrokerClient", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("../../../clients/BrokerClient")>();

    return {
        // The path validator is the real one, so that these tests cover what it rejects.
        BrokerClient: {
            isValidAdminPath: actual.BrokerClient.isValidAdminPath,
            forwardAdmin: mocks.forwardAdmin,
            getMe: mocks.getMe,
        },
    };
});

const origin = "https://droidpp.osudroid.moe";

let server: Server;
let baseUrl: string;

// Stands in for the session middleware: a request is logged in as the uid in this header.
const testSession: RequestHandler = (req, res, next) => {
    const uid = req.get("X-Test-Uid");

    if (uid !== undefined) {
        res.locals.uid = parseInt(uid);
    }

    next();
};

async function start() {
    const { requireAllowedOrigin } = await import("../../../auth/originCheck");
    const manage = (await import("./manage")).default;

    const app = express();
    const router = express.Router();

    app.use(express.json());
    app.use(bodyParserErrorHandler);
    app.use("/api/manage", router);

    router.use(requireAllowedOrigin([origin]));
    router.use(testSession);
    router.use(manage);

    await new Promise<void>((resolve) => {
        server = app.listen(0, "127.0.0.1", resolve);
    });

    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function request(
    method: string,
    path: string,
    options: { body?: unknown; headers?: Record<string, string> } = {},
) {
    return fetch(baseUrl + path, {
        method,
        headers: {
            "Content-Type": "application/json",
            Origin: origin,
            "X-Test-Uid": "42",
            ...options.headers,
        },
        body:
            options.body === undefined
                ? undefined
                : JSON.stringify(options.body),
    });
}

describe("management routes", () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.spyOn(console, "error").mockImplementation(() => {});

        mocks.forwardAdmin.mockResolvedValue({ status: 200, body: { ok: 1 } });
        mocks.getUsernames.mockResolvedValue(new Map());
        mocks.getMe.mockResolvedValue({ uid: 42, role: "admin", grants: [] });

        await start();
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
        Object.values(mocks).forEach((m) => m.mockReset());
        vi.restoreAllMocks();
    });

    it("requires a session", async () => {
        const res = await fetch(baseUrl + "/api/manage/variants", {
            headers: { Origin: origin },
        });

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ message: "Not logged in" });

        const usernames = await fetch(baseUrl + "/api/manage/usernames?uids=1");

        expect(usernames.status).toBe(401);
        expect(mocks.forwardAdmin).not.toHaveBeenCalled();
        expect(mocks.getUsernames).not.toHaveBeenCalled();
    });

    describe("forwarding", () => {
        it("forwards admin requests as the logged-in person", async () => {
            mocks.forwardAdmin.mockResolvedValue({
                status: 201,
                body: { key: "raw-key" },
            });

            const res = await request("POST", "/api/manage/variants/x/keys", {
                body: { name: "n" },
            });

            expect(res.status).toBe(201);
            expect(res.headers.get("cache-control")).toBe("no-store");
            expect(await res.json()).toEqual({ key: "raw-key" });
            expect(mocks.forwardAdmin).toHaveBeenCalledWith(
                "POST",
                "/variants/x/keys",
                42,
                { name: "n" },
            );
        });

        it("sends no body for GET and DELETE", async () => {
            await request("GET", "/api/manage/variants?ignored=1");
            await request("DELETE", "/api/manage/variants/x", {
                body: { a: 1 },
            });

            expect(mocks.forwardAdmin).toHaveBeenNthCalledWith(
                1,
                "GET",
                "/variants",
                42,
                undefined,
            );
            expect(mocks.forwardAdmin).toHaveBeenNthCalledWith(
                2,
                "DELETE",
                "/variants/x",
                42,
                undefined,
            );
        });

        it("forwards PUT and PATCH bodies", async () => {
            await request("PUT", "/api/manage/variants/x", { body: { a: 1 } });
            await request("PATCH", "/api/manage/variants/x", {
                body: { b: 2 },
            });

            expect(mocks.forwardAdmin).toHaveBeenNthCalledWith(
                1,
                "PUT",
                "/variants/x",
                42,
                { a: 1 },
            );
            expect(mocks.forwardAdmin).toHaveBeenNthCalledWith(
                2,
                "PATCH",
                "/variants/x",
                42,
                { b: 2 },
            );
        });

        it("passes the broker's error status and body through", async () => {
            mocks.forwardAdmin.mockResolvedValue({
                status: 403,
                body: { error: { code: "FORBIDDEN", message: "No" } },
            });

            const res = await request("GET", "/api/manage/variants");

            expect(res.status).toBe(403);
            expect(await res.json()).toEqual({
                error: { code: "FORBIDDEN", message: "No" },
            });
        });

        it("answers 404 without calling the broker for paths the validator rejects", async () => {
            const paths = [
                "/api/manage/variants/a.b",
                "/api/manage/variants/a%2Fb",
                "/api/manage/variants//x",
                "/api/manage",
                "/api/manage/",
            ];

            for (const path of paths) {
                const res = await request("GET", path);

                expect(res.status, path).toBe(404);
                expect(await res.json()).toEqual({ message: "Not found" });
            }

            expect(mocks.forwardAdmin).not.toHaveBeenCalled();
        });

        it("answers 502 when the broker client fails for any other reason", async () => {
            const error = vi.mocked(console.error);

            mocks.forwardAdmin.mockRejectedValue(
                new Error("DPP_BROKER_URL is not set"),
            );

            const res = await request("GET", "/api/manage/variants");

            expect(res.status).toBe(502);
            expect(await res.json()).toEqual({
                message: "The variant service is unavailable",
            });
            expect(error).toHaveBeenCalledTimes(1);
            expect(error).toHaveBeenCalledWith(
                "Could not forward a management request to the broker",
            );
        });

        it("limits JSON bodies to 64 KB", async () => {
            const res = await request("PUT", "/api/manage/variants/x", {
                body: { description: "a".repeat(70 * 1024) },
            });

            expect(res.status).toBe(413);
            expect(mocks.forwardAdmin).not.toHaveBeenCalled();

            const ok = await request("PUT", "/api/manage/variants/x", {
                body: { description: "a".repeat(60 * 1024) },
            });

            expect(ok.status).toBe(200);
        });

        it("rejects state-changing requests from other origins", async () => {
            for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
                const res = await request(method, "/api/manage/variants/x", {
                    body: {},
                    headers: { Origin: "https://evil.example" },
                });

                expect(res.status).toBe(403);
            }

            const noOrigin = await fetch(baseUrl + "/api/manage/variants/x", {
                method: "DELETE",
                headers: { "X-Test-Uid": "42" },
            });

            expect(noOrigin.status).toBe(403);
            expect(mocks.forwardAdmin).not.toHaveBeenCalled();
        });
    });

    describe("usernames", () => {
        it("returns the usernames of the found users only", async () => {
            mocks.getUsernames.mockResolvedValue(
                new Map([
                    [1, "One"],
                    [3, "Three"],
                ]),
            );

            const res = await request(
                "GET",
                "/api/manage/usernames?uids=1,2,3,1",
            );

            expect(res.status).toBe(200);
            expect(res.headers.get("cache-control")).toBe("no-store");
            expect(await res.json()).toEqual({ 1: "One", 3: "Three" });
            expect(mocks.getUsernames).toHaveBeenCalledWith([1, 2, 3]);
            expect(mocks.forwardAdmin).not.toHaveBeenCalled();
        });

        it("limits usernames lookups to 100 positive uids", async () => {
            const uids = (count: number) =>
                Array.from({ length: count }, (_, i) => i + 1).join(",");

            const ok = await request(
                "GET",
                `/api/manage/usernames?uids=${uids(100)}`,
            );

            expect(ok.status).toBe(200);

            const invalid = [
                "",
                uids(101),
                "0",
                "-1",
                "1.5",
                "abc",
                "1,,2",
                "1,",
                "2147483648",
                "1e3",
                " 1",
            ];

            for (const value of invalid) {
                const res = await request(
                    "GET",
                    `/api/manage/usernames?uids=${encodeURIComponent(value)}`,
                );

                expect(res.status, value).toBe(400);
                expect(await res.json()).toEqual({ message: "Invalid uids" });
            }

            const missing = await request("GET", "/api/manage/usernames");

            expect(missing.status).toBe(400);

            const repeated = await request(
                "GET",
                "/api/manage/usernames?uids=1&uids=2",
            );

            expect(repeated.status).toBe(400);

            const max = await request(
                "GET",
                "/api/manage/usernames?uids=2147483647",
            );

            expect(max.status).toBe(200);
            expect(mocks.getUsernames).toHaveBeenCalledTimes(2);
        });
    });
    describe("user roles", () => {
        function stubRoles(
            roles: Record<number, "admin" | "manager" | null | undefined>,
        ) {
            mocks.getMe.mockImplementation(async (uid: number) => {
                const role = roles[uid];

                return role === undefined ? null : { uid, role, grants: [] };
            });
        }

        it("requires a session", async () => {
            const res = await fetch(baseUrl + "/api/manage/user-roles?uids=1");

            expect(res.status).toBe(401);
            expect(mocks.getMe).not.toHaveBeenCalled();
        });

        it("answers the role of each person to an admin", async () => {
            stubRoles({ 42: "admin", 7: "manager", 8: null, 9: "admin" });

            const res = await request(
                "GET",
                "/api/manage/user-roles?uids=7,8,9",
            );

            expect(res.status).toBe(200);
            expect(res.headers.get("cache-control")).toBe("no-store");
            expect(await res.json()).toEqual([
                { uid: 7, role: "manager" },
                { uid: 8, role: null },
                { uid: 9, role: "admin" },
            ]);
            expect(mocks.getMe).toHaveBeenCalledWith(42);
            expect(mocks.getMe).toHaveBeenCalledWith(7);
            expect(mocks.forwardAdmin).not.toHaveBeenCalled();
        });

        it("answers a manager", async () => {
            stubRoles({ 42: "manager", 8: null });

            const res = await request("GET", "/api/manage/user-roles?uids=8");

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual([{ uid: 8, role: null }]);
        });

        it("refuses a person without a role, without looking anyone up", async () => {
            stubRoles({ 42: null, 8: "admin" });

            const res = await request("GET", "/api/manage/user-roles?uids=8");

            expect(res.status).toBe(403);
            expect(mocks.getMe).toHaveBeenCalledTimes(1);
            expect(mocks.getMe).toHaveBeenCalledWith(42);
        });

        it("answers 502 when the caller or a person cannot be looked up", async () => {
            stubRoles({ 42: "admin" });

            const missingTarget = await request(
                "GET",
                "/api/manage/user-roles?uids=8",
            );

            expect(missingTarget.status).toBe(502);

            mocks.getMe.mockResolvedValue(null);

            const missingCaller = await request(
                "GET",
                "/api/manage/user-roles?uids=8",
            );

            expect(missingCaller.status).toBe(502);
        });

        it("checks the uids as the usernames lookup does", async () => {
            const uids = (count: number) =>
                Array.from({ length: count }, (_, i) => i + 1).join(",");

            mocks.getMe.mockImplementation(async (uid: number) => ({
                uid,
                role: uid === 42 ? "admin" : null,
                grants: [],
            }));

            const ok = await request(
                "GET",
                `/api/manage/user-roles?uids=${uids(100)}`,
            );

            expect(ok.status).toBe(200);

            for (const value of [
                "",
                uids(101),
                "0",
                "1,,2",
                "abc",
                "2147483648",
            ]) {
                const res = await request(
                    "GET",
                    `/api/manage/user-roles?uids=${encodeURIComponent(value)}`,
                );

                expect(res.status, value).toBe(400);
                expect(await res.json()).toEqual({ message: "Invalid uids" });
            }

            const missing = await request("GET", "/api/manage/user-roles");

            expect(missing.status).toBe(400);
        });
    });
});
