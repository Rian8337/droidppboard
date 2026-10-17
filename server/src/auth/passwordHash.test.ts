import { describe, expect, it } from "vitest";
import {
    currentPasswordHash,
    legacyPasswordHash,
    passwordMatches,
    phpAddSlashes,
    phpHtmlSpecialChars,
    phpTrim,
} from "./passwordHash";

describe("PHP equivalents", () => {
    it("phpAddSlashes escapes quotes, backslashes and NUL", () => {
        expect(phpAddSlashes("'")).toBe("\\'");
        expect(phpAddSlashes('"')).toBe('\\"');
        expect(phpAddSlashes("\\")).toBe("\\\\");
        expect(phpAddSlashes("\0")).toBe("\\0");
        expect(phpAddSlashes("a\0b")).toBe("a\\0b");
        expect(phpAddSlashes("plain &<>")).toBe("plain &<>");
    });

    it("phpHtmlSpecialChars converts the default characters", () => {
        expect(phpHtmlSpecialChars("&")).toBe("&amp;");
        expect(phpHtmlSpecialChars('"')).toBe("&quot;");
        expect(phpHtmlSpecialChars("'")).toBe("&#039;");
        expect(phpHtmlSpecialChars("<")).toBe("&lt;");
        expect(phpHtmlSpecialChars(">")).toBe("&gt;");
        expect(phpHtmlSpecialChars("&amp;")).toBe("&amp;amp;");
        expect(phpHtmlSpecialChars("plain \\ \0")).toBe("plain \\ \0");
    });

    it("phpTrim removes only the characters PHP trims", () => {
        expect(phpTrim(" \t\n\r\0\x0Bab \t")).toBe("ab");
        expect(phpTrim("\u00a0ab\u00a0")).toBe("\u00a0ab\u00a0");
        expect(phpTrim("a b")).toBe("a b");
        expect(phpTrim(" \t")).toBe("");
    });
});

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
        expect(passwordMatches("secret", "\u00e9".repeat(32))).toBe(false);
    });

    it("tells the two forms apart for passwords with special characters", () => {
        expect(currentPasswordHash(`a'b`)).not.toBe(legacyPasswordHash(`a'b`));
        expect(currentPasswordHash("ab")).toBe(legacyPasswordHash("ab"));
    });
});
