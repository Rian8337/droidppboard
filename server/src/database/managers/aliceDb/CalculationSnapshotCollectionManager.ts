import { CalculationResponse, CalculationSnapshot } from "app-structures";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";

/**
 * A snapshot as the `calculationsnapshots` collection holds it, with its dates as `Date`s so that
 * MongoDB can expire it.
 */
export interface StoredCalculationSnapshot {
    id: string;
    createdAt: Date;
    expiresAt: Date;
    calculation: CalculationResponse;
}

/**
 * A manager for the `calculationsnapshots` collection.
 */
export class CalculationSnapshotCollectionManager extends DatabaseCollectionManager<StoredCalculationSnapshot> {
    override get defaultDocument(): StoredCalculationSnapshot {
        return {
            id: "",
            createdAt: new Date(0),
            expiresAt: new Date(0),
            calculation: {} as CalculationResponse,
        };
    }

    /**
     * Stores a snapshot.
     *
     * @param snapshot The snapshot.
     */
    async insertSnapshot(snapshot: CalculationSnapshot): Promise<void> {
        await this.collection.insertOne({
            id: snapshot.id,
            createdAt: new Date(snapshot.createdAt),
            expiresAt: new Date(snapshot.expiresAt),
            calculation: snapshot.calculation,
        });
    }

    /**
     * Finds a snapshot by its ID. MongoDB removes expired snapshots only periodically, so the
     * snapshot found may be past its expiry.
     *
     * @param id The ID of the snapshot.
     * @returns The snapshot, `null` if not found.
     */
    async findSnapshot(id: string): Promise<CalculationSnapshot | null> {
        const stored = await this.getOne({ id }, { projection: { _id: 0 } });

        return stored === null
            ? null
            : {
                  id: stored.id,
                  createdAt: stored.createdAt.toISOString(),
                  expiresAt: stored.expiresAt.toISOString(),
                  calculation: stored.calculation,
              };
    }

    /**
     * Makes MongoDB remove snapshots once their expiry has passed.
     */
    async ensureExpiryIndex(): Promise<void> {
        await this.collection.createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 },
        );
    }
}
