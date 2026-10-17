import { Router } from "express";
import { BrokerClient } from "../../../clients/BrokerClient";
import { OsuDroidAccounts } from "../../../auth/OsuDroidAccounts";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = Router();

router.get(
    "/",
    asyncHandler(async (_, res) => {
        res.set("Cache-Control", "no-store");

        const uid: unknown = res.locals.uid;

        if (typeof uid !== "number") {
            res.status(401).json({ message: "Not logged in" });

            return;
        }

        const [usernames, me] = await Promise.all([
            OsuDroidAccounts.getUsernames([uid]),
            BrokerClient.getMe(uid),
        ]);

        const username = usernames.get(uid);

        if (username === undefined) {
            res.status(401).json({ message: "Not logged in" });

            return;
        }

        res.json({
            uid,
            username,
            role: me?.role ?? null,
            grants: me?.grants ?? [],
        });
    }),
);

export default router;
