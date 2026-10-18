import { describe, expect, it } from "vitest";
import { canManageFullRuns, canRemoveAnyEntry } from "./permissions";

describe("canManageFullRuns", () => {
    it("allows only admins", () => {
        expect(canManageFullRuns({ uid: 1, role: "admin", grants: [] })).toBe(
            true,
        );
        expect(canManageFullRuns({ uid: 1, role: "manager", grants: [] })).toBe(
            false,
        );
        expect(canManageFullRuns({ uid: 1, role: null, grants: [] })).toBe(
            false,
        );
        expect(canManageFullRuns(null)).toBe(false);
    });
});

describe("canRemoveAnyEntry", () => {
    it("allows only admins", () => {
        expect(canRemoveAnyEntry({ uid: 1, role: "admin", grants: [] })).toBe(
            true,
        );
        expect(canRemoveAnyEntry({ uid: 1, role: "manager", grants: [] })).toBe(
            false,
        );
        expect(canRemoveAnyEntry({ uid: 1, role: null, grants: [] })).toBe(
            false,
        );
        expect(canRemoveAnyEntry(null)).toBe(false);
    });
});
