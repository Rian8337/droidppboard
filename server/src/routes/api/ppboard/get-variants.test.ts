import { PPVariant } from "app-structures";
import express from "express";
import { Server } from "http";
import { AddressInfo } from "net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrokerClient } from "../../../clients/BrokerClient";
import getVariants from "./get-variants";

let uid: number | undefined;
let server: Server;
let baseUrl: string;

function variant(overrides: Partial<PPVariant> & { name: string }): PPVariant {
    return {
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
        ...overrides,
    };
}

describe("GET /variants", () => {
    beforeEach(async () => {
        uid = undefined;

        const app = express();

        app.use((_, res, next) => {
            res.locals.uid = uid;
            next();
        });
        app.use("/variants", getVariants);

        await new Promise<void>((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });

        baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
        vi.restoreAllMocks();
    });

    it("lists the visible droid variants without droid-live", async () => {
        const secret = variant({
            name: "secret",
            public: false,
            builtAt: "2026-10-01T00:00:00.000Z",
            calculatorVersion: "1.2.3",
        });

        vi.spyOn(BrokerClient, "getVariants").mockResolvedValue([
            variant({ name: "droid-live", algorithm: "live" }),
            variant({ name: "osu-rebalance", mode: "osu" }),
            variant({ name: "droid-rebalance" }),
            secret,
        ]);

        const res = await fetch(baseUrl + "/variants");

        expect(res.status).toBe(200);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(await res.json()).toEqual([
            variant({ name: "droid-rebalance" }),
            secret,
        ]);
    });

    it("acts for the person in the session", async () => {
        const getVariantsSpy = vi
            .spyOn(BrokerClient, "getVariants")
            .mockResolvedValue([]);

        uid = 1234;

        await fetch(baseUrl + "/variants");

        expect(getVariantsSpy).toHaveBeenCalledWith(1234);
    });

    it("answers 503 when the broker cannot be reached", async () => {
        vi.spyOn(BrokerClient, "getVariants").mockResolvedValue(null);

        const res = await fetch(baseUrl + "/variants");

        expect(res.status).toBe(503);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(await res.json()).toEqual({
            message: "The rework list is unavailable",
        });
    });
});
