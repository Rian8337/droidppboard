import { Request, Response, Router } from "express";
import { PPVariant } from "app-structures";
import { OsuDroidAccounts } from "../../../auth/OsuDroidAccounts";
import { BrokerClient } from "../../../clients/BrokerClient";
import { recalculationQueue } from "../../../recalculation/instance";
import { canManageFullRuns } from "../../../recalculation/permissions";
import {
    parseFullRunStartRequest,
    parseQueueRequest,
} from "../../../recalculation/requests";
import { asyncHandler } from "../../../utils/asyncHandler";
import {
    listVisibleDroidVariants,
    resolveVisibleVariant,
} from "../../../utils/visibleVariant";

const router = Router();

router.use((_, res, next) => {
    res.set("Cache-Control", "no-store");

    next();
});

function getUid(res: Response): number | undefined {
    const uid: unknown = res.locals.uid;

    return typeof uid === "number" ? uid : undefined;
}

/**
 * Answers 401 unless a person is logged in.
 *
 * @returns The uid of the person, or `undefined` if the request was answered.
 */
function requireUid(res: Response): number | undefined {
    const uid = getUid(res);

    if (uid === undefined) {
        res.status(401).json({ message: "Log in to use the queue" });
    }

    return uid;
}

function answerBrokerUnavailable(res: Response) {
    res.status(503).json({ message: "The variant service is unavailable" });
}

/**
 * Resolves the variant of a request for the viewer, or answers that it is not found.
 *
 * @returns The variant, or `undefined` if the request was answered.
 */
async function resolveVariantOrAnswer(
    res: Response,
    name: string,
    uid: number | undefined,
): Promise<PPVariant | undefined> {
    const resolved = await resolveVisibleVariant(name, uid);

    if (resolved === "unavailable") {
        answerBrokerUnavailable(res);

        return undefined;
    }

    if (resolved === "notFound") {
        res.status(404).json({ message: "Variant not found" });

        return undefined;
    }

    return resolved.current;
}

/**
 * Checks that the person is an admin and that the variant is visible to them, as full-run
 * routes need.
 *
 * @returns The person and the variant, or `undefined` if the request was answered.
 */
async function authorizeFullRun(
    req: Request,
    res: Response,
): Promise<{ uid: number; variant: PPVariant } | undefined> {
    const uid = requireUid(res);

    if (uid === undefined) {
        return undefined;
    }

    if (!canManageFullRuns(await BrokerClient.getMe(uid))) {
        res.status(403).json({ message: "Only admins can manage full runs" });

        return undefined;
    }

    const variant = await resolveVariantOrAnswer(res, req.params.variant, uid);

    return variant ? { uid, variant } : undefined;
}

router.get(
    "/queue",
    asyncHandler(async (req, res) => {
        const uid = getUid(res);
        const requested: unknown = req.query.variant;

        // Query parameters can be parsed into arrays or objects, which name no variant.
        if (requested !== undefined && typeof requested !== "string") {
            res.status(404).json({ message: "Variant not found" });

            return;
        }

        // The global view has no variant to resolve, so it must not go through the default one.
        const [visible, me] = await Promise.all([
            requested === undefined
                ? listVisibleDroidVariants(uid).then((variants) =>
                      variants === null
                          ? ("unavailable" as const)
                          : { variants, current: null },
                  )
                : resolveVisibleVariant(requested, uid),
            uid === undefined ? null : BrokerClient.getMe(uid),
        ]);

        if (visible === "unavailable") {
            answerBrokerUnavailable(res);

            return;
        }

        if (visible === "notFound") {
            res.status(404).json({ message: "Variant not found" });

            return;
        }

        res.json({
            ...recalculationQueue.snapshot(
                new Set(visible.variants.map((v) => v.name)),
                visible.current?.name ?? null,
                uid,
            ),
            canManageFullRuns: canManageFullRuns(me),
        });
    }),
);

router.post(
    "/queue",
    asyncHandler(async (req, res) => {
        const uid = requireUid(res);

        if (uid === undefined) {
            return;
        }

        const request = parseQueueRequest(req.body);

        if (!request) {
            res.status(400).json({ message: "Invalid request" });

            return;
        }

        const variant = await resolveVariantOrAnswer(res, request.variant, uid);

        if (!variant) {
            return;
        }

        const [player, usernames] = await Promise.all([
            OsuDroidAccounts.findPlayer(request.player),
            OsuDroidAccounts.getUsernames([uid]),
        ]);

        if (!player) {
            res.status(404).json({ message: "Player not found" });

            return;
        }

        if (player.archived) {
            res.status(404).json({ message: "This player is archived" });

            return;
        }

        if (!variant.available || variant.healthyInstanceCount < 1) {
            res.status(409).json({ message: "This variant is unavailable" });

            return;
        }

        const queuedByUsername = usernames.get(uid);

        if (queuedByUsername === undefined) {
            res.status(401).json({ message: "Log in to use the queue" });

            return;
        }

        const result = recalculationQueue.enqueue({
            uid: player.id,
            username: player.username,
            variant: variant.name,
            capacity: variant.healthyInstanceCount,
            queuedByUid: uid,
            queuedByUsername,
        });

        if (result.ok) {
            res.status(201).json(result.entry);

            return;
        }

        if (result.reason === "duplicate") {
            res.status(409).json({
                message: "This player is already queued for this variant",
            });

            return;
        }

        if (result.reason === "limit") {
            const { maxActive } = recalculationQueue.allowance(uid);

            res.status(429).json({
                message: `You can have at most ${maxActive.toString()} players waiting or calculating`,
            });

            return;
        }

        const retryAfter = result.retryAfterSeconds ?? 1;

        res.set("Retry-After", retryAfter.toString())
            .status(429)
            .json({
                message: `Wait ${retryAfter.toString()} seconds before adding another player`,
            });
    }),
);

router.delete(
    "/queue/:id",
    asyncHandler(async (req, res) => {
        const uid = requireUid(res);

        if (uid === undefined) {
            return;
        }

        const { id } = req.params;
        const entryVariant = recalculationQueue.getEntryVariant(id);

        // An entry of a variant the person cannot see answers like a missing one, so that a
        // private variant is never revealed.
        if (entryVariant === undefined) {
            res.status(404).json({ message: "Entry not found" });

            return;
        }

        const [visible, me] = await Promise.all([
            listVisibleDroidVariants(uid),
            BrokerClient.getMe(uid),
        ]);

        if (visible === null) {
            answerBrokerUnavailable(res);

            return;
        }

        if (!visible.some((v) => v.name === entryVariant)) {
            res.status(404).json({ message: "Entry not found" });

            return;
        }

        const result = recalculationQueue.remove(
            id,
            uid,
            canManageFullRuns(me),
        );

        switch (result) {
            case "removed":
                res.status(204).end();

                return;
            case "notFound":
                res.status(404).json({ message: "Entry not found" });

                return;
            case "forbidden":
                res.status(403).json({
                    message: "You can only remove your own entries",
                });

                return;
            case "notWaiting":
                res.status(409).json({
                    message: "Only waiting entries can be removed",
                });

                return;
        }
    }),
);

router.post(
    "/full-runs/:variant/start",
    asyncHandler(async (req, res) => {
        const authorized = await authorizeFullRun(req, res);

        if (!authorized) {
            return;
        }

        const request = parseFullRunStartRequest(req.body);

        if (!request) {
            res.status(400).json({ message: "Invalid request" });

            return;
        }

        const { uid, variant } = authorized;
        const username = (await OsuDroidAccounts.getUsernames([uid])).get(uid);

        if (username === undefined) {
            res.status(401).json({ message: "Log in to use the queue" });

            return;
        }

        let result: "started" | "alreadyRunning";

        try {
            result = await recalculationQueue.startFullRun(
                variant.name,
                variant.healthyInstanceCount,
                { uid, username },
                request.restart,
            );
        } catch (e) {
            // The error is not sent on, as it can hold details of the database.
            console.error(
                `Could not start the full run of ${variant.name}:`,
                e instanceof Error ? e.name : typeof e,
            );
            res.status(500).json({ message: "Could not start the full run" });

            return;
        }

        if (result === "alreadyRunning") {
            res.status(409).json({
                message: "A full run of this variant is already running",
            });

            return;
        }

        res.status(204).end();
    }),
);

router.post(
    "/full-runs/:variant/stop",
    asyncHandler(async (req, res) => {
        const authorized = await authorizeFullRun(req, res);

        if (!authorized) {
            return;
        }

        if (
            recalculationQueue.stopFullRun(authorized.variant.name) ===
            "notRunning"
        ) {
            res.status(409).json({
                message: "No full run of this variant is running",
            });

            return;
        }

        res.status(204).end();
    }),
);

export default router;
