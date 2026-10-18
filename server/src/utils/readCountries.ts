import { OsuDroidAccounts } from "../auth/OsuDroidAccounts";

/**
 * Reads the countries of players for a response, in one query.
 *
 * Countries are decoration, so a failure is logged and answered as if no country were known.
 *
 * @param uids The uids of the players.
 * @returns A map from uid to country code. Players whose country is unknown are absent.
 */
export async function readCountries(
    uids: number[],
): Promise<Map<number, string>> {
    const unique = [...new Set(uids)];

    if (unique.length === 0) {
        return new Map();
    }

    try {
        return await OsuDroidAccounts.getCountries(unique);
    } catch (e) {
        console.error("Failed to read the countries of players:", e);

        return new Map();
    }
}
