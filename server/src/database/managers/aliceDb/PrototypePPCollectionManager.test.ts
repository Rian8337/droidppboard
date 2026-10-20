import { IPrototypePP } from "app-structures";
import { Collection } from "mongodb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrototypePPCollectionManager } from "./PrototypePPCollectionManager";

function createManager() {
    const toArray = vi.fn().mockResolvedValue([]);
    const collection = {
        createIndex: vi.fn().mockResolvedValue("index"),
        find: vi.fn().mockReturnValue({ toArray }),
        updateOne: vi.fn().mockResolvedValue({}),
    };

    return {
        collection,
        manager: new PrototypePPCollectionManager(
            collection as unknown as Collection<IPrototypePP>,
        ),
    };
}

describe("PrototypePPCollectionManager", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("creates the indexes that recalculation queries by", async () => {
        const { collection, manager } = createManager();

        await manager.ensureIndexes();

        expect(collection.createIndex.mock.calls).toEqual([
            [{ uid: 1, reworkType: 1 }],
            [{ reworkType: 1, scanDone: 1, localPPTotal: -1 }],
        ]);
    });

    it("logs an index that cannot be created and creates the rest", async () => {
        const { collection, manager } = createManager();
        const error = vi.spyOn(console, "error").mockImplementation(() => {});

        collection.createIndex.mockRejectedValueOnce(
            new Error("Index already exists with a different name"),
        );

        await manager.ensureIndexes();

        expect(collection.createIndex).toHaveBeenCalledTimes(2);
        expect(error).toHaveBeenCalledTimes(1);
    });

    it("gets a player's profiles that recorded one of the builds", async () => {
        const { collection, manager } = createManager();

        await manager.getReusableProfiles(7, {
            "droid-live": "live-1",
            experiment: "experiment-1",
        });

        expect(collection.find).toHaveBeenCalledWith(
            {
                uid: 7,
                $or: [
                    { "calculatorBuilds.droid-live": "live-1" },
                    { "calculatorBuilds.experiment": "experiment-1" },
                ],
            },
            {
                projection: {
                    _id: 0,
                    reworkType: 1,
                    pp: 1,
                    calculatorBuilds: 1,
                },
            },
        );
    });

    it("does not query without builds", async () => {
        const { collection, manager } = createManager();

        await expect(manager.getReusableProfiles(7, {})).resolves.toEqual([]);
        expect(collection.find).not.toHaveBeenCalled();
    });

    it("saves the builds with the profile", async () => {
        const { collection, manager } = createManager();

        await manager.saveProfile(7, "experiment", {
            pp: [],
            localPPTotal: 1,
            livePPTotal: 2,
            username: "Player",
            calculatorBuilds: { experiment: "build" },
        });

        expect(collection.updateOne.mock.calls[0][1].$set).toMatchObject({
            calculatorBuilds: { experiment: "build" },
            scanDone: true,
        });
    });
});
