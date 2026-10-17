import cookieParser from "cookie-parser";
import express from "express";
import { AddressInfo } from "net";
import { Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentPasswordHash } from "../../../auth/passwordHash";

const mocks = vi.hoisted(() => ({
    findForLogin: vi.fn(),
    isActive: vi.fn(),
    getUsernames: vi.fn(),
    verifyTurnstile: vi.fn(),
    getMe: vi.fn(),
    store: {
        create: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("../../../auth/OsuDroidAccounts", () => ({
    OsuDroidAccounts: {
        findForLogin: mocks.findForLogin,
        isActive: mocks.isActive,
        getUsernames: mocks.getUsernames,
    },
}));
vi.mock("../../../auth/Turnstile", () => ({
    verifyTurnstile: mocks.verifyTurnstile,
}));
vi.mock("../../../clients/BrokerClient", () => ({
    BrokerClient: { getMe: mocks.getMe },
}));
vi.mock("../../../auth/sessions", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../../auth/sessions")>()),
    getSessionStore: () => mocks.store,
}));

const origin = "https://droidpp.osudroid.moe";
const token = "A".repeat(43);

let server: Server;
let baseUrl: string;

async function start() {
    const { requireAllowedOrigin } = await import("../../../auth/originCheck");
    const { sessionMiddleware } =
        await import("../../../auth/sessionMiddleware");
    const login = (await import("./login")).default;
    const logout = (await import("./logout")).default;
    const me = (await import("./me")).default;

    const app = express();
    const router = express.Router();

    app.use(express.json());
    app.use(cookieParser());
    app.use("/api/auth", router);

    router.use(requireAllowedOrigin([origin]));
    router.use(sessionMiddleware);
    router.use("/login", login);
    router.use("/logout", logout);
    router.use("/me", me);

    await new Promise<void>((resolve) => {
        server = app.listen(0, "127.0.0.1", resolve);
    });

    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function post(
    path: string,
    body: unknown,
    headers: Record<string, string> = {},
) {
    return fetch(baseUrl + path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Origin: origin,
            ...headers,
        },
        body: JSON.stringify(body),
    });
}

const validBody = {
    username: "Player",
    password: "correct horse",
    turnstileToken: "captcha",
};

const account = {
    id: 42,
    username: "Player",
    password: currentPasswordHash("correct horse"),
    banned: false,
    archived: false,
};

describe("auth routes", () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});

        mocks.findForLogin.mockResolvedValue(account);
        mocks.isActive.mockResolvedValue(true);
        mocks.getUsernames.mockResolvedValue(new Map([[42, "Player"]]));
        mocks.verifyTurnstile.mockResolvedValue(true);
        mocks.getMe.mockResolvedValue({
            uid: 42,
            role: "admin",
            grants: ["x"],
        });
        mocks.store.create.mockResolvedValue(token);
        mocks.store.get.mockResolvedValue({ uid: 42 });
        mocks.store.delete.mockResolvedValue(undefined);

        await start();
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
        Object.values(mocks).forEach((m) => "mockReset" in m && m.mockReset());
        Object.values(mocks.store).forEach((m) => m.mockReset());
        vi.restoreAllMocks();
    });

    describe("login", () => {
        it("logs in with the right credentials", async () => {
            const res = await post("/api/auth/login", {
                ...validBody,
                username: "  Player ",
            });

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({ uid: 42, username: "Player" });
            expect(mocks.findForLogin).toHaveBeenCalledWith("Player");
            expect(mocks.store.create).toHaveBeenCalledWith(42);

            const cookie = res.headers.get("set-cookie")!;

            expect(cookie).toContain(`ppboard_session=${token}`);
            expect(cookie).toContain("HttpOnly");
            expect(cookie).toContain("SameSite=Strict");
            expect(cookie).toContain("Path=/");
            expect(cookie).toContain("Max-Age=604800");
        });

        it("rejects malformed bodies without involving the throttle or captcha", async () => {
            const bodies = [
                {},
                { ...validBody, username: "   " },
                { ...validBody, username: "x".repeat(21) },
                { ...validBody, username: { $ne: "" } },
                { ...validBody, password: "" },
                { ...validBody, password: "x".repeat(101) },
                { ...validBody, password: ["a"] },
                { ...validBody, turnstileToken: "" },
                { ...validBody, turnstileToken: "x".repeat(2049) },
                { ...validBody, turnstileToken: 5 },
            ];

            for (const body of bodies) {
                const res = await post("/api/auth/login", body);

                expect(res.status).toBe(400);
                expect(await res.json()).toEqual({
                    message: "Invalid request",
                });
            }

            expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
            expect(mocks.findForLogin).not.toHaveBeenCalled();
        });

        it("answers the same for wrong passwords, unknown, banned and archived accounts", async () => {
            const responses: unknown[] = [];

            mocks.findForLogin.mockResolvedValueOnce({
                ...account,
                password: currentPasswordHash("other"),
            });
            mocks.findForLogin.mockResolvedValueOnce(null);
            mocks.findForLogin.mockResolvedValueOnce({
                ...account,
                banned: true,
            });
            mocks.findForLogin.mockResolvedValueOnce({
                ...account,
                archived: true,
            });

            for (const username of ["a", "b", "c", "d"]) {
                const res = await post("/api/auth/login", {
                    ...validBody,
                    username,
                });

                expect(res.status).toBe(401);
                expect(res.headers.get("set-cookie")).toBeNull();
                responses.push(await res.json());
            }

            for (const body of responses) {
                expect(body).toEqual({
                    message: "Invalid username or password",
                });
            }

            expect(mocks.store.create).not.toHaveBeenCalled();
        });

        it("logs the ip and username of a failure, never the password", async () => {
            const warn = vi.mocked(console.warn);

            mocks.findForLogin.mockResolvedValueOnce(null);

            await post("/api/auth/login", {
                ...validBody,
                username: "evil\nname",
            });

            const logged = warn.mock.calls.flat().join(" ");

            expect(logged).toContain("127.0.0.1");
            expect(logged).toContain(JSON.stringify("evil\nname"));
            expect(logged).not.toContain("\n");
            expect(logged).not.toContain(validBody.password);
        });

        it("does not look up accounts when the captcha fails", async () => {
            mocks.verifyTurnstile.mockResolvedValue(false);

            const res = await post("/api/auth/login", validBody);

            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({
                message: "Captcha verification failed",
            });
            expect(mocks.findForLogin).not.toHaveBeenCalled();
        });

        it("refuses a username after repeated failures", async () => {
            mocks.findForLogin.mockResolvedValue(null);

            for (let i = 0; i < 3; ++i) {
                expect((await post("/api/auth/login", validBody)).status).toBe(
                    401,
                );
            }

            const res = await post("/api/auth/login", validBody);

            expect(res.status).toBe(429);
            expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
            expect(await res.json()).toEqual({
                message: "Too many login attempts. Please try again later.",
            });
            expect(mocks.verifyTurnstile).toHaveBeenCalledTimes(3);
        });

        it("rejects logins from other origins", async () => {
            const res = await post("/api/auth/login", validBody, {
                Origin: "https://evil.example",
            });

            expect(res.status).toBe(403);
            expect(mocks.findForLogin).not.toHaveBeenCalled();
        });

        it("answers 500 without details when something breaks", async () => {
            mocks.findForLogin.mockRejectedValue(new Error("db down"));

            const res = await post("/api/auth/login", validBody);

            expect(res.status).toBe(500);
            expect(await res.json()).toEqual({
                message: "Internal server error",
            });
        });
    });

    describe("me", () => {
        const cookie = { Cookie: `ppboard_session=${token}` };

        it("answers 401 without a session", async () => {
            const res = await fetch(`${baseUrl}/api/auth/me`);

            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ message: "Not logged in" });
            expect(mocks.store.get).not.toHaveBeenCalled();
        });

        it("describes the person with a session", async () => {
            const res = await fetch(`${baseUrl}/api/auth/me`, {
                headers: cookie,
            });

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual({
                uid: 42,
                username: "Player",
                role: "admin",
                grants: ["x"],
            });
            expect(mocks.getMe).toHaveBeenCalledWith(42);
        });

        it("has no role when the broker cannot be reached", async () => {
            mocks.getMe.mockResolvedValue(null);

            const res = await fetch(`${baseUrl}/api/auth/me`, {
                headers: cookie,
            });

            expect(await res.json()).toEqual({
                uid: 42,
                username: "Player",
                role: null,
                grants: [],
            });
        });

        it("drops sessions of banned or archived accounts", async () => {
            mocks.isActive.mockResolvedValue(false);

            const res = await fetch(`${baseUrl}/api/auth/me`, {
                headers: cookie,
            });

            expect(res.status).toBe(401);
            expect(mocks.store.delete).toHaveBeenCalledWith(token);
            expect(res.headers.get("set-cookie")).toContain(
                "ppboard_session=;",
            );
        });

        it("clears a cookie that holds no session", async () => {
            mocks.store.get.mockResolvedValue(null);

            const res = await fetch(`${baseUrl}/api/auth/me`, {
                headers: cookie,
            });

            expect(res.status).toBe(401);
            expect(res.headers.get("set-cookie")).toContain(
                "ppboard_session=;",
            );
        });

        it("ignores cookies that cannot be tokens, including JSON ones", async () => {
            for (const value of [
                "short",
                `j:${encodeURIComponent(JSON.stringify({ a: 1 }))}`,
            ]) {
                const res = await fetch(`${baseUrl}/api/auth/me`, {
                    headers: { Cookie: `ppboard_session=${value}` },
                });

                expect(res.status).toBe(401);
            }

            expect(mocks.store.get).not.toHaveBeenCalled();
        });

        it("continues as a visitor, keeping the cookie, when sessions cannot be checked", async () => {
            mocks.store.get.mockRejectedValue(new Error("db down"));

            const res = await fetch(`${baseUrl}/api/auth/me`, {
                headers: cookie,
            });

            expect(res.status).toBe(401);
            expect(res.headers.get("set-cookie")).toBeNull();
        });
    });

    describe("logout", () => {
        it("deletes the session and clears the cookie", async () => {
            const res = await post(
                "/api/auth/logout",
                {},
                {
                    Cookie: `ppboard_session=${token}`,
                },
            );

            expect(res.status).toBe(204);
            expect(mocks.store.delete).toHaveBeenCalledWith(token);
            expect(res.headers.get("set-cookie")).toContain(
                "ppboard_session=;",
            );
        });

        it("rejects logouts from other origins", async () => {
            const res = await post(
                "/api/auth/logout",
                {},
                {
                    Origin: "https://evil.example",
                    Cookie: `ppboard_session=${token}`,
                },
            );

            expect(res.status).toBe(403);
            expect(mocks.store.delete).not.toHaveBeenCalled();
        });
    });
});
