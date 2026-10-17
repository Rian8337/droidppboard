import { Router } from "express";
import { readSessionToken } from "../../../auth/sessionMiddleware";
import {
    getClearSessionCookieOptions,
    getSessionStore,
    sessionCookieName,
} from "../../../auth/sessions";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.post(
    "/",
    asyncHandler(async (req, res) => {
        const token = readSessionToken(req.cookies);

        // The session is deleted first, so that a failure leaves the cookie for a retry.
        if (token) {
            await getSessionStore().delete(token);
        }

        res.clearCookie(sessionCookieName, getClearSessionCookieOptions());
        res.status(204).end();
    }),
);

export default router;
