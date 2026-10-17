import { RequestHandler } from "express";
import { OsuDroidAccounts } from "./OsuDroidAccounts";
import { fingerprintsMatch } from "./passwordFingerprint";
import {
    getClearSessionCookieOptions,
    getSessionStore,
    sessionCookieName,
} from "./sessions";

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

/**
 * Gets the session token from a request's cookies.
 *
 * @param cookies The parsed cookies of the request.
 * @returns The token, or `undefined` if there is none that could be one.
 */
export function readSessionToken(cookies: unknown): string | undefined {
    if (typeof cookies !== "object" || cookies === null) {
        return undefined;
    }

    // Cookie values can be parsed into objects, so the type has to be checked.
    const token = (cookies as Record<string, unknown>)[sessionCookieName];

    return typeof token === "string" && tokenPattern.test(token)
        ? token
        : undefined;
}

/**
 * Identifies the person that makes a request from the session cookie. For a valid session of an
 * account that is neither banned nor archived, and whose password has not changed since the
 * session was created, this sets `res.locals.uid`. Otherwise the request
 * continues as a visitor, and a cookie that does not lead to a valid session is cleared.
 *
 * This never rejects: if sessions or accounts cannot be checked, the request continues as a visitor.
 */
export const sessionMiddleware: RequestHandler = async (req, res, next) => {
    delete res.locals.uid;

    try {
        const rawToken = (req.cookies as Record<string, unknown> | undefined)?.[
            sessionCookieName
        ];

        if (rawToken === undefined) {
            next();

            return;
        }

        const token = readSessionToken(req.cookies);
        const store = getSessionStore();
        const session = token ? await store.get(token) : null;

        const state = session
            ? await OsuDroidAccounts.getSessionState(session.uid)
            : null;

        // Sessions from before passwords were tracked have no fingerprint and are not valid.
        if (
            token &&
            session &&
            state?.active &&
            fingerprintsMatch(
                session.passwordFingerprint,
                state.passwordFingerprint,
            )
        ) {
            res.locals.uid = session.uid;
        } else {
            if (token && session) {
                // The account is banned, archived, gone or has a new password, so the session is
                // of no use anymore.
                await store.delete(token);
            }

            res.clearCookie(sessionCookieName, getClearSessionCookieOptions());
        }
    } catch {
        console.error("Could not check the session; continuing as a visitor");
    }

    next();
};
