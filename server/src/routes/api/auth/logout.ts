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

        res.clearCookie(sessionCookieName, getClearSessionCookieOptions());

        if (token) {
            await getSessionStore().delete(token);
        }

        res.status(204).end();
    }),
);

export default router;
