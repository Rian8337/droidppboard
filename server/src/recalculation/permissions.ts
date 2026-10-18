import { BrokerMe } from "../clients/BrokerClient";

/**
 * Checks whether a person may start, stop and restart full runs. This is the only role check
 * for full runs.
 *
 * @param me The broker's view of the person, or `null` if they are not logged in or it could
 * not be fetched.
 * @returns Whether the person is an admin.
 */
export function canManageFullRuns(me: BrokerMe | null): boolean {
    return me?.role === "admin";
}
