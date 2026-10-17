import { describe, expect, it } from "vitest";
import {
    currentPasswordHash,
    legacyPasswordHash,
    passwordMatches,
} from "./passwordHash";

const passwords = [
    "plain",
    `it's "quoted"`,
    "back\\slash",
    "a&b<c>d",
    `  '"\\&<>  `,
    "pass\tword",
    "unicode é中",
];

describe("passwordMatches", () => {
    it("accepts current and legacy hashes", () => {
        for (const password of passwords) {
            const trimmed = password.trim();

            expect(
                passwordMatches(password, currentPasswordHash(trimmed)),
            ).toBe(true);
            expect(passwordMatches(password, legacyPasswordHash(trimmed))).toBe(
                true,
            );
        }
    });

    it("trims surrounding whitespace before comparing", () => {
        const stored = currentPasswordHash("secret");

        expect(passwordMatches("  secret \n", stored)).toBe(true);
        expect(passwordMatches("secret", stored)).toBe(true);
    });

    it("does not trim other whitespace than the site does", () => {
        const stored = currentPasswordHash("secret");

        expect(passwordMatches(" secret", stored)).toBe(false);
    });

    it("rejects a wrong password for both forms", () => {
        for (const password of passwords) {
            const trimmed = password.trim();

            expect(passwordMatches("wrong", currentPasswordHash(trimmed))).toBe(
                false,
            );
            expect(passwordMatches("wrong", legacyPasswordHash(trimmed))).toBe(
                false,
            );
        }
    });

    it("rejects an empty password and malformed stored hashes", () => {
        expect(passwordMatches("   ", currentPasswordHash(""))).toBe(false);
        expect(passwordMatches("secret", "")).toBe(false);
        expect(passwordMatches("secret", "short")).toBe(false);
    });

    it("tells the two forms apart for passwords with special characters", () => {
        expect(currentPasswordHash(`a'b`)).not.toBe(legacyPasswordHash(`a'b`));
        expect(currentPasswordHash("ab")).toBe(legacyPasswordHash("ab"));
    });
});
