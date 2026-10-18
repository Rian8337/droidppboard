import "dotenv/config";
import { randomUUID } from "crypto";
import { BrokerClient } from "../clients/BrokerClient";
import { DatabaseManager } from "../database/managers/DatabaseManager";
import { readRecalcLimits } from "./limits";
import { calculateProfile } from "./ProfileCalculator";
import { FullRunStore, RecalculationQueue } from "./RecalculationQueue";

/**
 * The store of full runs. The collection is resolved on use, as the database connects after
 * this module loads.
 */
const fullRunStore: FullRunStore = {
    countProfiles: (reworkType) =>
        DatabaseManager.aliceDb.collections.prototypePP.countProfiles(
            reworkType,
        ),
    countScanned: (reworkType) =>
        DatabaseManager.aliceDb.collections.prototypePP.countScanned(
            reworkType,
        ),
    getUnscannedUids: (reworkType, excludeUids, limit) =>
        DatabaseManager.aliceDb.collections.prototypePP.getUnscannedUids(
            reworkType,
            excludeUids,
            limit,
        ),
    resetScanDone: (reworkType) =>
        DatabaseManager.aliceDb.collections.prototypePP.resetScanDone(
            reworkType,
        ),
    cloneProfiles: (source, target) =>
        DatabaseManager.aliceDb.collections.prototypePP.cloneProfiles(
            source,
            target,
        ),
};

/**
 * The recalculation queue of the whole process.
 */
export const recalculationQueue = new RecalculationQueue({
    now: () => Date.now(),
    newId: () => randomUUID(),
    limits: readRecalcLimits(process.env),
    calculate: (uid, variant, actingUid, onProgress) =>
        calculateProfile(uid, variant, actingUid, onProgress),
    getCapacity: async (variant, actingUid) =>
        (await BrokerClient.getVariant(variant, actingUid))
            ?.healthyInstanceCount ?? null,
    fullRunStore,
});

/**
 * The milliseconds between refreshes of the calculator counts.
 */
export const capacityRefreshIntervalMs = 15_000;

/**
 * Refreshes the calculator counts of the variants that have work every
 * {@link capacityRefreshIntervalMs}. A refresh that fails is logged and does not stop the next.
 */
export function startCapacityRefresh(): void {
    setInterval(() => {
        recalculationQueue.refreshCapacities().catch((e: unknown) => {
            console.error(
                "Could not refresh the calculator counts:",
                e instanceof Error ? e.name : typeof e,
            );
        });
    }, capacityRefreshIntervalMs);
}
