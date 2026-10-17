import { createHash, createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    fingerprintsMatch,
    getPasswordFingerprint,
    warnIfSessionSecretUnset,
} from "./passwordFingerprint";

describe("password fingerprint", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it("is an HMAC of the stored hash keyed by the session secret", () => {
        vi.stubEnv("SESSION_SECRET", "secret");

        expect(getPasswordFingerprint("stored")).toBe(
            createHmac("sha256", "secret").update("stored").digest("hex"),
        );
    });

    it("differs between hashes and between secrets", () => {
        vi.stubEnv("SESSION_SECRET", "one");
        const first = getPasswordFingerprint("a");

        expect(getPasswordFingerprint("b")).not.toBe(first);

        vi.stubEnv("SESSION_SECRET", "two");

        expect(getPasswordFingerprint("a")).not.toBe(first);
    });

    it("falls back to a plain SHA-256 without a secret", () => {
        vi.stubEnv("SESSION_SECRET", "");

        expect(getPasswordFingerprint("stored")).toBe(
            createHash("sha256").update("stored").digest("hex"),
        );
    });

    it("compares fingerprints, refusing missing ones", () => {
        expect(fingerprintsMatch("abc", "abc")).toBe(true);
        expect(fingerprintsMatch("abc", "abd")).toBe(false);
        expect(fingerprintsMatch("abc", "abcd")).toBe(false);
        expect(fingerprintsMatch(undefined, "abc")).toBe(false);
        expect(fingerprintsMatch("abc", undefined)).toBe(false);
        expect(fingerprintsMatch(undefined, undefined)).toBe(false);
    });

    it("warns once about a missing secret, without printing anything secret", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        vi.stubEnv("SESSION_SECRET", "");
        warnIfSessionSecretUnset();

        expect(warn).toHaveBeenCalledTimes(1);

        vi.stubEnv("SESSION_SECRET", "set");
        warn.mockClear();
        warnIfSessionSecretUnset();

        expect(warn).not.toHaveBeenCalled();
    });
});
