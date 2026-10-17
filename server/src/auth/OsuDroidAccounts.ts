import { RowDataPacket } from "mysql2/promise";
import { officialDb } from "../database/official";
import { getPasswordFingerprint } from "./passwordFingerprint";
import { phpTrim } from "./passwordHash";

interface UserRow extends RowDataPacket {
    id: number;
    username: string;
    password: string;
    banned: number;
    archived: number;
}

/**
 * An account in the official osu!droid database, as needed for logging in.
 */
export interface OsuDroidLoginAccount {
    id: number;
    username: string;
    password: string;
    banned: boolean;
    archived: boolean;
}

/**
 * Reads osu!droid accounts from the official database.
 */
export abstract class OsuDroidAccounts {
    /**
     * Finds the account to log in to.
     *
     * @param username The username that was entered. Surrounding whitespace is ignored.
     * @returns The account, or `null` if there is none.
     */
    static async findForLogin(
        username: string,
    ): Promise<OsuDroidLoginAccount | null> {
        const [rows] = await officialDb.execute<UserRow[]>(
            "SELECT id, username, password, banned, archived FROM bbl_user WHERE username = ? LIMIT 1",
            [phpTrim(username)],
        );

        const row = rows[0];

        if (!row) {
            return null;
        }

        return {
            id: row.id,
            username: row.username,
            password: row.password,
            banned: row.banned !== 0,
            archived: row.archived !== 0,
        };
    }

    /**
     * Gets what is needed to decide whether a session of an account is still good.
     *
     * @param uid The uid of the account.
     * @returns Whether the account is active (neither banned nor archived) and the fingerprint of
     * its current password hash, or `null` if it does not exist.
     */
    static async getSessionState(
        uid: number,
    ): Promise<{ active: boolean; passwordFingerprint: string } | null> {
        const [rows] = await officialDb.execute<UserRow[]>(
            "SELECT password, banned, archived FROM bbl_user WHERE id = ? LIMIT 1",
            [uid],
        );

        const row = rows[0];

        if (!row) {
            return null;
        }

        return {
            active: row.banned === 0 && row.archived === 0,
            passwordFingerprint: getPasswordFingerprint(row.password),
        };
    }

    /**
     * Gets the usernames of accounts.
     *
     * @param uids The uids of the accounts.
     * @returns A map from uid to username. Accounts that do not exist are absent.
     */
    static async getUsernames(uids: number[]): Promise<Map<number, string>> {
        const unique = [...new Set(uids)];
        const usernames = new Map<number, string>();

        if (unique.length === 0) {
            return usernames;
        }

        const [rows] = await officialDb.execute<UserRow[]>(
            `SELECT id, username FROM bbl_user WHERE id IN (${unique
                .map(() => "?")
                .join(", ")})`,
            unique,
        );

        for (const row of rows) {
            usernames.set(row.id, row.username);
        }

        return usernames;
    }
}
