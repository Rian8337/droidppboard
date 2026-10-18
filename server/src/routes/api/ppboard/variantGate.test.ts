import { PPVariant } from "app-structures";
import express from "express";
import { AddressInfo } from "net";
import { Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    searchPlayers: vi.fn(),
    getFromUid: vi.fn(),
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
    OsuDroidAccounts: { getCountries: vi.fn().mockResolvedValue(new Map()) },
}));

function variant(name: string): PPVariant {
    return {
        name,
        title: null,
        aliases: [],
        description: null,
        available: true,
        healthyInstanceCount: 1,
        mode: "droid",
        algorithm: "rebalance",
        public: true,
        builtAt: null,
        calculatorVersion: null,
    };
}

let server: Server;
let baseUrl: string;

async function start() {
    const getLeaderboard = (await import("./get-leaderboard")).default;
    const getUserProfile = (await import("./get-user-profile")).default;
    const getTopPlays = (await import("./get-top-plays")).default;

    const app = express();

    app.use("/leaderboard", getLeaderboard);
    app.use("/profile", getUserProfile);
    app.use("/topplays", getTopPlays);

    await new Promise<void>((resolve) => {
        server = app.listen(0, "127.0.0.1", resolve);
    });

    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

describe("variant visibility on the ppboard routes", () => {
    beforeEach(async () => {
        vi.resetModules();

        const { BrokerClient } = await import("../../../clients/BrokerClient");
        const { Util } = await import("../../../utils/Util");

        // The broker leaves private variants out of a visitor's list.
        vi.spyOn(BrokerClient, "getVariants").mockResolvedValue([
            variant("droid-live"),
            variant("droid-rebalance"),
        ]);
        vi.spyOn(Util, "getTopPrototypePP").mockReturnValue([]);

        await start();
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
        Object.values(mocks).forEach((m) => m.mockReset());
        vi.restoreAllMocks();
    });

    it.each([
        ["get-leaderboard", "/leaderboard?type=secret"],
        ["get-user-profile", "/profile?uid=1&type=secret"],
        ["get-top-plays", "/topplays?type=secret"],
    ])(
        "%s answers a private variant as not found without reading its data",
        async (_, path) => {
            const { Util } = await import("../../../utils/Util");

            const res = await fetch(baseUrl + path);

            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({ message: "Variant not found" });
            expect(res.headers.get("cache-control")).toBe("no-store");
            expect(Util.getTopPrototypePP).not.toHaveBeenCalled();
            expect(mocks.searchPlayers).not.toHaveBeenCalled();
            expect(mocks.getFromUid).not.toHaveBeenCalled();
        },
    );

    it("answers 404 for droid-live on the leaderboard", async () => {
        const res = await fetch(baseUrl + "/leaderboard?type=droid-live");

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ message: "Variant not found" });
        expect(mocks.searchPlayers).not.toHaveBeenCalled();
    });

    it("get-top-plays reads the data of a visible variant", async () => {
        const { Util } = await import("../../../utils/Util");

        const res = await fetch(baseUrl + "/topplays?type=droid-rebalance");

        expect(res.status).toBe(200);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(Util.getTopPrototypePP).toHaveBeenCalledWith(
            "droid-rebalance",
            undefined,
        );
    });
});
