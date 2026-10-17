import { CookieOptions } from "express";
import { DatabaseManager } from "../database/managers/DatabaseManager";
import { SessionDocument, SessionStore } from "./SessionStore";

/**
 * The name of the cookie that holds the session token.
 */
export const sessionCookieName = "ppboard_session";

function baseCookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
    };
}

/**
 * Gets the options of the session cookie. The server-side expiry is authoritative, so the cookie's
 * own lifetime only has to be long enough.
 */
export function getSessionCookieOptions(): CookieOptions {
    return { ...baseCookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 };
}

/**
 * Gets the options for clearing the session cookie, which must match those it was set with
 * except for its lifetime.
 */
export function getClearSessionCookieOptions(): CookieOptions {
    return baseCookieOptions();
}

let store: SessionStore | undefined;

/**
 * Gets the store of login sessions. The database must have been initialized.
 */
export function getSessionStore(): SessionStore {
    store ??= new SessionStore(
        DatabaseManager.aliceDb.instance.collection<SessionDocument>(
            "ppboardsession",
        ),
        Date.now,
    );

    return store;
}

/**
 * Creates the indexes that sessions rely on. The database must have been initialized.
 */
export async function initSessions(): Promise<void> {
    try {
        await getSessionStore().ensureIndexes();
    } catch (e) {
        console.error(
            "Could not create the session indexes:",
            e instanceof Error ? e.message : typeof e,
        );
    }
}
