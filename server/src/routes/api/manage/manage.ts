import { RequestHandler, Router } from "express";
import { BrokerClient } from "../../../clients/BrokerClient";
import { OsuDroidAccounts } from "../../../auth/OsuDroidAccounts";
import { asyncHandler } from "../../../utils/asyncHandler";

const maxBodyBytes = 64 * 1024;
const maxUsernameLookups = 100;
const maxUid = 2147483647;
const methodsWithBody = new Set(["PUT", "PATCH", "POST"]);
const forwardedMethods = new Set(["GET", "PUT", "PATCH", "POST", "DELETE"]);

const router = Router();

router.use((_, res, next) => {
    res.set("Cache-Control", "no-store");

    next();
});

const requireSession: RequestHandler = (_, res, next) => {
    if (typeof res.locals.uid !== "number") {
        res.status(401).json({ message: "Not logged in" });

        return;
    }

    next();
};

router.use(requireSession);

/**
 * The app-wide JSON parser allows more than the management API should, so the limit is enforced
 * here. Both the declared and the parsed size are checked, as the declared one can be absent.
 */
router.use((req, res, next) => {
    const declared = parseInt(req.get("Content-Length") ?? "0");
    const parsed =
        req.body === undefined
            ? 0
            : Buffer.byteLength(JSON.stringify(req.body));

    if (declared > maxBodyBytes || parsed > maxBodyBytes) {
        res.status(413).json({ message: "Request too large" });

        return;
    }

    next();
});

router.get(
    "/usernames",
    asyncHandler(async (req, res) => {
        const uids = parseUids(req.query.uids);

        if (!uids) {
            res.status(400).json({ message: "Invalid uids" });

            return;
        }

        const usernames = await OsuDroidAccounts.getUsernames(uids);

        res.json(Object.fromEntries(usernames));
    }),
);

router.use(
    asyncHandler(async (req, res) => {
        if (!forwardedMethods.has(req.method)) {
            res.status(405).json({ message: "Method not allowed" });

            return;
        }

        if (!BrokerClient.isValidAdminPath(req.path)) {
            res.status(404).json({ message: "Not found" });

            return;
        }

        const body = methodsWithBody.has(req.method) ? req.body : undefined;

        let response;

        try {
            response = await BrokerClient.forwardAdmin(
                req.method,
                req.path,
                res.locals.uid as number,
                body,
            );
        } catch {
            // The path was valid, so this is a problem on our side, such as the broker URL not
            // being set. The error is not logged, as it could embed request details.
            console.error(
                "Could not forward a management request to the broker",
            );
            res.status(502).json({
                message: "The variant service is unavailable",
            });

            return;
        }

        // Bodies are passed through as they are, and never logged: they can hold raw API keys.
        res.status(response.status).json(response.body);
    }),
);

/**
 * Parses the `uids` query parameter.
 *
 * @param value The raw query value.
 * @returns The unique uids, or `null` if the value is not 1 to 100 comma-separated positive uids.
 */
function parseUids(value: unknown): number[] | null {
    if (typeof value !== "string") {
        return null;
    }

    const parts = value.split(",");

    if (parts.length > maxUsernameLookups) {
        return null;
    }

    const uids = new Set<number>();

    for (const part of parts) {
        if (!/^[1-9][0-9]{0,9}$/.test(part)) {
            return null;
        }

        const uid = parseInt(part);

        if (uid > maxUid) {
            return null;
        }

        uids.add(uid);
    }

    return [...uids];
}

export default router;
