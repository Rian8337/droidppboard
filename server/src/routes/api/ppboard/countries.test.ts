import express from "express";
import { AddressInfo } from "net";
import { Server } from "http";
import { PPVariant } from "app-structures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    searchPlayers: vi.fn(),
    getFromUid: vi.fn(),
    getCountries: vi.fn(),
}));

vi.mock("../../../database/managers/DatabaseManager", () => ({
    DatabaseManager: {
        aliceDb: {
            collections: {
                prototypePP: {
                    searchPlayers: mocks.searchPlayers,
                    getFromUid: mocks.getFromUid,
                },
            },
        },
    },
}));
vi.mock("../../../auth/OsuDroidAccounts", () => ({
    OsuDroidAccounts: { getCountries: mocks.getCountries },
}));

const variant: PPVariant = {
    name: "droid-rebalance",
    title: null,
    aliases: [],
    description: null,
    available: true,
    healthyInstanceCount: 1,
    mode: "droid",
    algorithm: "rebalance",
    public: true,
    pinned: false,
    builtAt: null,
    calculatorVersion: null,
};

function buildTopPlay(uid: number, username: string) {
    return { uid, username, hash: `hash-${uid}`, title: "Song" };
}

let server: Server;
let baseUrl: string;

describe("player countries on the ppboard routes", () => {
    beforeEach(async () => {
        vi.resetModules();

        const { BrokerClient } = await import("../../../clients/BrokerClient");
        const { Util } = await import("../../../utils/Util");

        vi.spyOn(BrokerClient, "getVariant").mockResolvedValue(variant);
        vi.spyOn(Util, "getTopPrototypePP").mockReturnValue([]);
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const app = express();

        app.use("/leaderboard", (await import("./get-leaderboard")).default);
        app.use("/profile", (await import("./get-user-profile")).default);
        app.use("/topplays", (await import("./get-top-plays")).default);

        await new Promise<void>((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });

        baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
        Object.values(mocks).forEach((m) => m.mockReset());
        vi.restoreAllMocks();
    });

    describe("get-leaderboard", () => {
        beforeEach(() => {
            mocks.searchPlayers.mockResolvedValue([
                { uid: 10, username: "Alpha" },
                { uid: 11, username: "Bravo" },
            ]);
        });

        it("gives each row the country of its player, from one lookup", async () => {
            mocks.getCountries.mockResolvedValue(new Map([[10, "ID"]]));

            const res = await fetch(baseUrl + "/leaderboard");
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual([
                { uid: 10, username: "Alpha", country: "ID" },
                { uid: 11, username: "Bravo", country: null },
            ]);
            expect(mocks.getCountries).toHaveBeenCalledTimes(1);
            expect(mocks.getCountries).toHaveBeenCalledWith([10, 11]);
        });

        it("answers with no countries when the lookup fails", async () => {
            mocks.getCountries.mockRejectedValue(new Error("connection lost"));

            const res = await fetch(baseUrl + "/leaderboard");
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual([
                { uid: 10, username: "Alpha", country: null },
                { uid: 11, username: "Bravo", country: null },
            ]);
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe("get-user-profile", () => {
        beforeEach(() => {
            mocks.getFromUid.mockResolvedValue({ uid: 10, username: "Alpha" });
        });

        it("gives the profile the country of its player", async () => {
            mocks.getCountries.mockResolvedValue(new Map([[10, "JP"]]));

            const res = await fetch(baseUrl + "/profile?uid=10");
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({
                uid: 10,
                username: "Alpha",
                country: "JP",
            });
            expect(mocks.getCountries).toHaveBeenCalledTimes(1);
            expect(mocks.getCountries).toHaveBeenCalledWith([10]);
        });

        it("answers with no country when the lookup fails", async () => {
            mocks.getCountries.mockRejectedValue(new Error("connection lost"));

            const res = await fetch(baseUrl + "/profile?uid=10");
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.country).toBeNull();
            expect(console.error).toHaveBeenCalled();
        });

        it("does not look up a player that is not found", async () => {
            mocks.getFromUid.mockResolvedValue(null);

            const res = await fetch(baseUrl + "/profile?uid=10");

            expect(res.status).toBe(404);
            expect(mocks.getCountries).not.toHaveBeenCalled();
        });
    });

    describe("get-top-plays", () => {
        beforeEach(async () => {
            const { Util } = await import("../../../utils/Util");

            vi.spyOn(Util, "getTopPrototypePP").mockReturnValue([
                buildTopPlay(10, "Alpha"),
                buildTopPlay(11, "Bravo"),
                buildTopPlay(10, "Alpha"),
            ] as never);
        });

        it("gives each play the country of its player, from one lookup", async () => {
            mocks.getCountries.mockResolvedValue(new Map([[10, "ID"]]));

            const res = await fetch(baseUrl + "/topplays");
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(
                body.map((play: { country: string | null }) => play.country),
            ).toEqual(["ID", null, "ID"]);
            expect(mocks.getCountries).toHaveBeenCalledTimes(1);
            expect(mocks.getCountries).toHaveBeenCalledWith([10, 11]);
        });

        it("answers with no countries when the lookup fails", async () => {
            mocks.getCountries.mockRejectedValue(new Error("connection lost"));

            const res = await fetch(baseUrl + "/topplays");
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(
                body.map((play: { country: string | null }) => play.country),
            ).toEqual([null, null, null]);
            expect(console.error).toHaveBeenCalled();
        });

        it("does not look up countries when there are no plays", async () => {
            const { Util } = await import("../../../utils/Util");

            vi.spyOn(Util, "getTopPrototypePP").mockReturnValue([]);

            const res = await fetch(baseUrl + "/topplays");

            expect(res.status).toBe(200);
            expect(mocks.getCountries).not.toHaveBeenCalled();
        });
    });
});
