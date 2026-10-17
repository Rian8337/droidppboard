import { Router } from "express";
import { LoginThrottle } from "../../../auth/LoginThrottle";
import { OsuDroidAccounts } from "../../../auth/OsuDroidAccounts";
import { readSessionToken } from "../../../auth/sessionMiddleware";
import { passwordMatches, phpTrim } from "../../../auth/passwordHash";
import {
    getSessionCookieOptions,
    getSessionStore,
    sessionCookieName,
} from "../../../auth/sessions";
import { verifyTurnstile } from "../../../auth/Turnstile";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

const throttle = new LoginThrottle(Date.now);

/**
 * A stored hash that no password produces. It is checked against when an account does not exist,
 * so that the response time does not reveal which usernames exist.
 */
const dummyHash = "0".repeat(32);

interface LoginRequest {
    username: string;
    password: string;
    turnstileToken: string;
}

function parseLoginRequest(body: unknown): LoginRequest | null {
    if (typeof body !== "object" || body === null) {
        return null;
    }

    const { username, password, turnstileToken } = body as Record<
        string,
        unknown
    >;

    if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        typeof turnstileToken !== "string"
    ) {
        return null;
    }

    const trimmedUsername = phpTrim(username);

    if (
        trimmedUsername.length < 1 ||
        trimmedUsername.length > 20 ||
        password.length < 1 ||
        password.length > 100 ||
        turnstileToken.length < 1 ||
        turnstileToken.length > 2048
    ) {
        return null;
    }

    return { username: trimmedUsername, password, turnstileToken };
}

router.post(
    "/",
    asyncHandler(async (req, res) => {
        res.set("Cache-Control", "no-store");

        const request = parseLoginRequest(req.body);

        if (!request) {
            res.status(400).json({ message: "Invalid request" });

            return;
        }

        const { username, password, turnstileToken } = request;
        const ip = req.ip ?? "unknown";

        const allowed = throttle.check(ip, username);

        if (!allowed.allowed) {
            res.set("Retry-After", allowed.retryAfterSeconds.toString())
                .status(429)
                .json({
                    message: "Too many login attempts. Please try again later.",
                });

            return;
        }

        // A failed captcha says nothing about the credentials, so it is not counted against them.
        if (!(await verifyTurnstile(turnstileToken, ip))) {
            res.status(400).json({ message: "Captcha verification failed" });

            return;
        }

        const account = await OsuDroidAccounts.findForLogin(username);
        const passwordIsCorrect = passwordMatches(
            password,
            account?.password ?? dummyHash,
        );

        if (
            !account ||
            !passwordIsCorrect ||
            account.banned ||
            account.archived
        ) {
            throttle.recordFailure(ip, username);

            // The username is quoted so that it cannot forge log lines.
            console.warn(
                `Failed login from ${ip} for username ${JSON.stringify(username)}`,
            );

            res.status(401).json({ message: "Invalid username or password" });

            return;
        }

        throttle.recordSuccess(username);

        const store = getSessionStore();
        const oldToken = readSessionToken(req.cookies);

        if (oldToken) {
            try {
                await store.delete(oldToken);
            } catch {
                console.error("Could not delete the previous session");
            }
        }

        const token = await store.create(account.id);

        res.cookie(sessionCookieName, token, getSessionCookieOptions());
        res.status(200).json({ uid: account.id, username: account.username });
    }),
);

export default router;
