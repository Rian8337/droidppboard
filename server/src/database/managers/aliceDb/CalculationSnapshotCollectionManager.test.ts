import { CalculationResponse, CalculationSnapshot } from "app-structures";
import { Collection } from "mongodb";
import { describe, expect, it, vi } from "vitest";
import {
    CalculationSnapshotCollectionManager,
    StoredCalculationSnapshot,
} from "./CalculationSnapshotCollectionManager";

const calculation = { variant: "droid-rebalance" } as CalculationResponse;

function createManager() {
    const collection = {
        createIndex: vi.fn().mockResolvedValue("index"),
        insertOne: vi.fn().mockResolvedValue({}),
        findOne: vi.fn(),
    };

    return {
        collection,
        manager: new CalculationSnapshotCollectionManager(
            collection as unknown as Collection<StoredCalculationSnapshot>,
        ),
    };
}

describe("CalculationSnapshotCollectionManager", () => {
    it("creates the TTL index on expiresAt and a unique index on id", async () => {
        const { collection, manager } = createManager();

        await manager.ensureIndexes();

        expect(collection.createIndex.mock.calls).toEqual([
            [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
            [{ id: 1 }, { unique: true }],
        ]);
    });

    it("stores the dates as Dates", async () => {
        const { collection, manager } = createManager();
        const snapshot: CalculationSnapshot = {
            id: "abcdefghij",
            createdAt: "2026-10-01T00:00:00.000Z",
            expiresAt: "2026-10-31T00:00:00.000Z",
            calculation,
        };

        await manager.insertSnapshot(snapshot);

        const [stored] = collection.insertOne.mock.calls[0] as [
            StoredCalculationSnapshot,
        ];

        expect(stored).toEqual({
            id: "abcdefghij",
            createdAt: new Date("2026-10-01T00:00:00.000Z"),
            expiresAt: new Date("2026-10-31T00:00:00.000Z"),
            calculation,
        });
        expect(stored.createdAt).toBeInstanceOf(Date);
        expect(stored.expiresAt).toBeInstanceOf(Date);
    });

    it("returns the dates as ISO strings and looks up by id without the _id", async () => {
        const { collection, manager } = createManager();

        collection.findOne.mockResolvedValue({
            id: "abcdefghij",
            createdAt: new Date("2026-10-01T00:00:00.000Z"),
            expiresAt: new Date("2026-10-31T00:00:00.000Z"),
            calculation,
        });

        expect(await manager.findSnapshot("abcdefghij")).toEqual({
            id: "abcdefghij",
            createdAt: "2026-10-01T00:00:00.000Z",
            expiresAt: "2026-10-31T00:00:00.000Z",
            calculation,
        });
        expect(collection.findOne).toHaveBeenCalledWith(
            { id: "abcdefghij" },
            { projection: { _id: 0 } },
        );
    });

    it("returns null for an unknown id", async () => {
        const { collection, manager } = createManager();

        collection.findOne.mockResolvedValue(null);

        expect(await manager.findSnapshot("abcdefghij")).toBeNull();
    });
});
