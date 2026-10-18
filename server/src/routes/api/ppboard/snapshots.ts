import { CalculationSnapshot } from "app-structures";
import { randomBytes } from "crypto";
import express, { RequestHandler } from "express";
import { calculateMyScore } from "../../../calculation/calculateMyScore";
import {
    calculatePrepared,
    prepareCalculation,
} from "../../../calculation/prepareCalculation";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";
import { Util } from "../../../utils/Util";
import { asyncHandler } from "../../../utils/asyncHandler";
import { resolveVisibleVariant } from "../../../utils/visibleVariant";

const router = express.Router();

const defaultTtlDays = 30;
const dayMs = 24 * 60 * 60 * 1000;

/**
 * Gets how many days a snapshot is kept, from `SNAPSHOT_TTL_DAYS`.
 */
function getTtlDays(): number {
    const days = Number(process.env.SNAPSHOT_TTL_DAYS);

    return Number.isFinite(days) && days > 0 ? days : defaultTtlDays;
}

/**
 * Makes a random ID of 10 URL-safe characters.
 */
function createId(): string {
    return randomBytes(8).toString("base64url").slice(0, 10);
}

/**
 * Checks whether a database write failed because of a duplicate key.
 */
function isDuplicateKeyError(e: unknown): boolean {
    return (e as { code?: unknown } | null)?.code === 11000;
}

const requireLogin: RequestHandler = (_, res, next) => {
    // Whether a snapshot can be made depends on who is logged in.
    res.set("Cache-Control", "no-store");

    if (typeof res.locals.uid !== "number") {
        res.status(401).json({ message: "Not logged in" });

        return;
    }

    next();
};

// Storing is limited per person, as a person on a shared network should not use up another's.
const limitCreation = Util.createRateLimit(
    5,
    60 * 1000,
    (_, res) => `uid:${String(res.locals.uid)}`,
);

router.post(
    "/",
    requireLogin,
    limitCreation,
    asyncHandler(async (req, res) => {
        const uid = res.locals.uid as number;
        const source: unknown = req.body?.source;

        if (source !== undefined && source !== "my-score") {
            res.status(400).json({ message: "Invalid source" });

            return;
        }

        const isMyScore = source === "my-score";
        const prepared = await prepareCalculation(req, uid, {
            isDroidOnly: isMyScore,
        });

        if ("error" in prepared) {
            res.status(prepared.status).json({ message: prepared.error });

            return;
        }

        // Only the server's own calculation is stored, never numbers sent by the client.
        const calculation = isMyScore
            ? await calculateMyScore(prepared, uid)
            : await calculatePrepared(prepared);

        if ("error" in calculation) {
            res.status(calculation.status).json({ message: calculation.error });

            return;
        }

        const createdAt = new Date();
        const expiresAt = new Date(
            createdAt.getTime() + getTtlDays() * dayMs,
        ).toISOString();
        let snapshot: CalculationSnapshot = {
            id: createId(),
            createdAt: createdAt.toISOString(),
            expiresAt,
            calculation,
        };
        const { calculationSnapshots } = DatabaseManager.aliceDb.collections;

        try {
            await calculationSnapshots.insertSnapshot(snapshot);
        } catch (e) {
            // The ID is unique in the collection, so a clash is answered by trying another ID.
            if (!isDuplicateKeyError(e)) {
                throw e;
            }

            snapshot = { ...snapshot, id: createId() };

            await calculationSnapshots.insertSnapshot(snapshot);
        }

        res.status(201).json({
            id: snapshot.id,
            expiresAt: snapshot.expiresAt,
        });
    }),
);

router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        // Whether a snapshot can be read depends on who is logged in.
        res.set("Cache-Control", "no-store");

        const uid: unknown = res.locals.uid;
        const snapshot =
            await DatabaseManager.aliceDb.collections.calculationSnapshots.findSnapshot(
                req.params.id,
            );

        if (snapshot === null) {
            res.status(404).json({ message: "Snapshot not found" });

            return;
        }

        const { calculation } = snapshot;

        // A snapshot of a variant that the person cannot see is the same as one that is not there.
        if (calculation.scope === "variant") {
            const resolved = await resolveVisibleVariant(
                calculation.variant,
                typeof uid === "number" ? uid : undefined,
            );

            if (resolved === "unavailable") {
                res.status(503).json({
                    message: "The rework list is unavailable",
                });

                return;
            }

            if (resolved === "notFound") {
                res.status(404).json({ message: "Snapshot not found" });

                return;
            }
        }

        // MongoDB removes expired snapshots only periodically, so the expiry is checked too.
        if (Date.parse(snapshot.expiresAt) <= Date.now()) {
            res.status(410).json({ message: "This snapshot has expired" });

            return;
        }

        res.json(snapshot);
    }),
);

export default router;
