import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import {
    SessionCollection,
    SessionDocument,
    SessionStore,
} from "./SessionStore";

const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

class FakeCollection implements SessionCollection {
    readonly documents: SessionDocument[] = [];
    readonly indexes: { spec: object; options: object }[] = [];
    updateCount = 0;

    async findOne(filter: { tokenHash: string }) {
        const found = this.documents.find(
            (d) => d.tokenHash === filter.tokenHash,
        );

        return found ? { ...found } : null;
    }

    async insertOne(document: SessionDocument) {
        this.documents.push({ ...document });
    }

    async updateOne(
        filter: { tokenHash: string },
        update: { $set: { expiresAt: Date } },
    ) {
        ++this.updateCount;

        const found = this.documents.find(
            (d) => d.tokenHash === filter.tokenHash,
        );

        if (found) {
            found.expiresAt = update.$set.expiresAt;
        }
    }

    async deleteOne(filter: { tokenHash: string }) {
        const index = this.documents.findIndex(
            (d) => d.tokenHash === filter.tokenHash,
        );

        if (index !== -1) {
            this.documents.splice(index, 1);
        }
    }

    async createIndex(spec: object, options: object) {
        this.indexes.push({ spec, options });
    }
}

function setup() {
    const collection = new FakeCollection();
    const clock = { time: Date.UTC(2026, 0, 1) };
    const store = new SessionStore(collection, () => clock.time);

    return { collection, clock, store };
}

describe("SessionStore", () => {
    it("stores only the token hash", async () => {
        const { collection, clock, store } = setup();

        const token = await store.create(42, "fp");

        expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(collection.documents).toHaveLength(1);

        const [document] = collection.documents;

        expect(document.tokenHash).toBe(
            createHash("sha256").update(token).digest("hex"),
        );
        expect(document.uid).toBe(42);
        expect(document.passwordFingerprint).toBe("fp");
        expect(document.createdAt.getTime()).toBe(clock.time);
        expect(document.expiresAt.getTime()).toBe(clock.time + day);
        expect(JSON.stringify(document)).not.toContain(token);
    });

    it("gives every session its own token", async () => {
        const { store } = setup();

        expect(await store.create(1, "fp")).not.toBe(
            await store.create(1, "fp"),
        );
    });

    it("finds a session by its token", async () => {
        const { store } = setup();

        const token = await store.create(7, "fp");

        expect(await store.get(token)).toEqual({
            uid: 7,
            passwordFingerprint: "fp",
        });
        expect(await store.get("not-a-token")).toBeNull();
    });

    it("returns no fingerprint for a session stored without one", async () => {
        const { collection, store } = setup();

        const token = await store.create(3, "fp");

        delete collection.documents[0].passwordFingerprint;

        expect(await store.get(token)).toEqual({ uid: 3 });
    });

    it("slides expiry by a day on use", async () => {
        const { collection, clock, store } = setup();
        const start = clock.time;

        const token = await store.create(1, "fp");

        clock.time += 6 * hour;

        expect(await store.get(token)).toEqual({
            uid: 1,
            passwordFingerprint: "fp",
        });
        expect(collection.documents[0].expiresAt.getTime()).toBe(
            start + 6 * hour + day,
        );
    });

    it("does not write when expiry would move by five minutes or less", async () => {
        const { collection, clock, store } = setup();

        const token = await store.create(1, "fp");

        clock.time += 5 * minute;
        await store.get(token);

        expect(collection.updateCount).toBe(0);

        clock.time += 1;
        await store.get(token);

        expect(collection.updateCount).toBe(1);
    });

    it("never extends past seven days", async () => {
        const { collection, clock, store } = setup();
        const start = clock.time;

        const token = await store.create(1, "fp");

        for (let i = 0; i < 8; ++i) {
            clock.time += 20 * hour;
            expect(await store.get(token)).toEqual({
                uid: 1,
                passwordFingerprint: "fp",
            });
        }

        // The last use was 160 hours in, which a day would take past the seven day cap.
        expect(collection.documents[0].expiresAt.getTime()).toBe(
            start + 7 * day,
        );
    });

    it("ends the session at the seven day cap even with constant use", async () => {
        const { clock, store } = setup();

        const token = await store.create(1, "fp");

        for (let i = 0; i < 7 * 24 - 1; ++i) {
            clock.time += hour;
            expect(await store.get(token)).toEqual({
                uid: 1,
                passwordFingerprint: "fp",
            });
        }

        clock.time += hour;

        expect(await store.get(token)).toBeNull();
    });

    it("forgets deleted and expired sessions", async () => {
        const { clock, store } = setup();

        const deleted = await store.create(1, "fp");
        const expired = await store.create(2, "fp");

        await store.delete(deleted);

        expect(await store.get(deleted)).toBeNull();

        clock.time += day;

        expect(await store.get(expired)).toBeNull();
    });

    it("creates the expiry and token indexes", async () => {
        const { collection, store } = setup();

        await store.ensureIndexes();

        expect(collection.indexes).toEqual([
            { spec: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
            { spec: { tokenHash: 1 }, options: { unique: true } },
        ]);
    });
});
