import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../database/managers/DatabaseManager", () => ({
    DatabaseManager: {},
}));

describe("session cookie options", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    async function secure(nodeEnv: string | undefined) {
        if (nodeEnv === undefined) {
            vi.stubEnv("NODE_ENV", undefined as unknown as string);
            delete process.env.NODE_ENV;
        } else {
            vi.stubEnv("NODE_ENV", nodeEnv);
        }

        const { getSessionCookieOptions, getClearSessionCookieOptions } =
            await import("./sessions");

        return [
            getSessionCookieOptions().secure,
            getClearSessionCookieOptions().secure,
        ];
    }

    it("is Secure when NODE_ENV is unset", async () => {
        expect(await secure(undefined)).toEqual([true, true]);
    });

    it("is Secure in production", async () => {
        expect(await secure("production")).toEqual([true, true]);
    });

    it("is Secure for any other environment name", async () => {
        expect(await secure("staging")).toEqual([true, true]);
    });

    it("is not Secure in development", async () => {
        expect(await secure("development")).toEqual([false, false]);
    });

    it("is not Secure in test", async () => {
        expect(await secure("test")).toEqual([false, false]);
    });
});
