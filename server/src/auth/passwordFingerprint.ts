import { createHash, createHmac, timingSafeEqual } from "crypto";

/**
 * Warns that sessions are fingerprinted without a secret, if that is the case. This is meant to
 * be called once at startup.
 */
export function warnIfSessionSecretUnset(): void {
    if (!process.env.SESSION_SECRET) {
        console.warn(
            "SESSION_SECRET is not set; session password fingerprints are not keyed",
        );
    }
}

/**
 * Gets the fingerprint of a stored password hash. A session keeps the fingerprint of the hash it
 * was created with, so that changing the password ends it. The fingerprint is keyed by
 * `SESSION_SECRET` so that a leaked sessions collection reveals nothing about the hashes.
 *
 * @param storedPasswordHash The password hash as stored by the official site.
 * @returns The fingerprint, as hex.
 */
export function getPasswordFingerprint(storedPasswordHash: string): string {
    const secret = process.env.SESSION_SECRET;

    return secret
        ? createHmac("sha256", secret).update(storedPasswordHash).digest("hex")
        : createHash("sha256").update(storedPasswordHash).digest("hex");
}

/**
 * Compares two fingerprints in constant time.
 *
 * @param stored The fingerprint kept by the session, if it has one.
 * @param current The fingerprint of the account's current password hash.
 * @returns Whether both exist and are equal.
 */
export function fingerprintsMatch(
    stored: string | undefined,
    current: string | undefined,
): boolean {
    if (stored === undefined || current === undefined) {
        return false;
    }

    const a = Buffer.from(stored, "utf8");
    const b = Buffer.from(current, "utf8");

    return a.length === b.length && timingSafeEqual(a, b);
}
