import { createHash, randomBytes } from "crypto";

const minute = 60 * 1000;
const day = 24 * 60 * minute;

/**
 * How long a session lasts without being used.
 */
const idleLifetimeMs = day;

/**
 * How long a session lasts at most, however much it is used.
 */
const maxLifetimeMs = 7 * day;

/**
 * The smallest move of the expiry that is worth a database write.
 */
const minExpiryUpdateMs = 5 * minute;

/**
 * A session as it is stored. The token itself is never stored, only its hash.
 */
export interface SessionDocument {
    tokenHash: string;
    uid: number;
    /**
     * A fingerprint of the account's password hash when the session was created. Sessions from
     * before this was tracked have none.
     */
    passwordFingerprint?: string;
    createdAt: Date;
    expiresAt: Date;
}

/**
 * The parts of a Mongo collection that the session store uses.
 */
export interface SessionCollection {
    findOne(filter: { tokenHash: string }): Promise<SessionDocument | null>;
    insertOne(document: SessionDocument): Promise<unknown>;
    updateOne(
        filter: { tokenHash: string },
        update: { $set: { expiresAt: Date } },
    ): Promise<unknown>;
    deleteOne(filter: { tokenHash: string }): Promise<unknown>;
    createIndex(
        spec: { expiresAt: 1 } | { tokenHash: 1 },
        options: { expireAfterSeconds: number } | { unique: boolean },
    ): Promise<unknown>;
}

function hashToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Stores login sessions.
 */
export class SessionStore {
    /**
     * @param collection The collection to store sessions in.
     * @param now Gets the current time in milliseconds.
     */
    constructor(
        private readonly collection: SessionCollection,
        private readonly now: () => number,
    ) {}

    /**
     * Creates the indexes that the store relies on. This is safe to do repeatedly.
     */
    async ensureIndexes(): Promise<void> {
        // The database removes sessions once their expiry has passed.
        await this.collection.createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 },
        );
        await this.collection.createIndex({ tokenHash: 1 }, { unique: true });
    }

    /**
     * Creates a session.
     *
     * @param uid The uid of the account that logged in.
     * @param passwordFingerprint The fingerprint of the account's password hash.
     * @returns The token of the session. This is the only time that it is available.
     */
    async create(uid: number, passwordFingerprint: string): Promise<string> {
        const token = randomBytes(32).toString("base64url");
        const now = this.now();

        await this.collection.insertOne({
            tokenHash: hashToken(token),
            uid,
            passwordFingerprint,
            createdAt: new Date(now),
            expiresAt: new Date(now + idleLifetimeMs),
        });

        return token;
    }

    /**
     * Gets the session of a token and, if it is valid, counts the token as used.
     *
     * Using a session moves its expiry to a day from now, but never past seven days after the
     * session was created.
     *
     * @param token The token.
     * @returns The session, or `null` if the token is unknown or expired.
     */
    async get(
        token: string,
    ): Promise<{ uid: number; passwordFingerprint?: string } | null> {
        const tokenHash = hashToken(token);
        const session = await this.collection.findOne({ tokenHash });

        if (!session) {
            return null;
        }

        const now = this.now();
        const hardLimit = session.createdAt.getTime() + maxLifetimeMs;

        // The database removes expired sessions only every so often.
        if (session.expiresAt.getTime() <= now || hardLimit <= now) {
            return null;
        }

        const expiresAt = Math.min(now + idleLifetimeMs, hardLimit);

        if (expiresAt - session.expiresAt.getTime() > minExpiryUpdateMs) {
            await this.collection.updateOne(
                { tokenHash },
                { $set: { expiresAt: new Date(expiresAt) } },
            );
        }

        return session.passwordFingerprint === undefined
            ? { uid: session.uid }
            : {
                  uid: session.uid,
                  passwordFingerprint: session.passwordFingerprint,
              };
    }

    /**
     * Deletes a session.
     *
     * @param token The token of the session.
     */
    async delete(token: string): Promise<void> {
        await this.collection.deleteOne({ tokenHash: hashToken(token) });
    }
}
