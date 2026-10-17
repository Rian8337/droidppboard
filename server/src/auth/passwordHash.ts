import { createHash, timingSafeEqual } from "crypto";

const phpTrimCharacters = " \t\n\r\0\x0B";

/**
 * Trims the same characters as PHP's `trim` does by default.
 *
 * @param value The string to trim.
 * @returns The trimmed string.
 */
export function phpTrim(value: string): string {
    let start = 0;
    let end = value.length;

    while (start < end && phpTrimCharacters.includes(value[start])) {
        ++start;
    }

    while (end > start && phpTrimCharacters.includes(value[end - 1])) {
        --end;
    }

    return value.slice(start, end);
}

function md5(value: string): string {
    return createHash("md5").update(value, "utf8").digest("hex");
}

function addSlashes(value: string): string {
    return value.replace(/['"\\]/g, "\\$&").replace(/\0/g, "\\0");
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * Computes the current stored hash of an already trimmed password.
 *
 * @param password The trimmed password.
 * @returns The hash, in lowercase hex.
 */
export function currentPasswordHash(password: string): string {
    return md5(password + "taikotaiko");
}

/**
 * Computes the legacy stored hash of an already trimmed password.
 *
 * @param password The trimmed password.
 * @returns The hash, in lowercase hex.
 */
export function legacyPasswordHash(password: string): string {
    return md5(escapeHtml(addSlashes(password)) + "taikotaiko");
}

function hexEquals(a: string, b: string): boolean {
    return (
        a.length === b.length &&
        timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"))
    );
}

/**
 * Checks whether a password matches a stored hash in either the current or the legacy form.
 *
 * @param password The password as it was entered.
 * @param storedHash The stored hash.
 * @returns Whether the password matches.
 */
export function passwordMatches(password: string, storedHash: string): boolean {
    const trimmed = phpTrim(password);

    if (trimmed === "") {
        return false;
    }

    const stored = storedHash.toLowerCase();

    // Both are always compared so that timing does not reveal which form matched.
    const matchesCurrent = hexEquals(currentPasswordHash(trimmed), stored);
    const matchesLegacy = hexEquals(legacyPasswordHash(trimmed), stored);

    return matchesCurrent || matchesLegacy;
}
