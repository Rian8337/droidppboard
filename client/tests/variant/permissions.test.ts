import { canManageVariant, isAdmin } from "../../src/variant/permissions";
import { adminMe, buildMe, managerMe, plainMe } from "../mocks/fixtures";

describe("isAdmin", () => {
    it("is true for an admin", () => {
        expect(isAdmin(adminMe)).toBe(true);
    });

    it("is false for a manager, a plain user, and nobody", () => {
        expect(isAdmin(managerMe)).toBe(false);
        expect(isAdmin(plainMe)).toBe(false);
        expect(isAdmin(null)).toBe(false);
    });
});

describe("canManageVariant", () => {
    it("lets an admin manage any variant", () => {
        expect(canManageVariant(adminMe, "flowaim")).toBe(true);
        expect(canManageVariant(adminMe, "droid-rebalance")).toBe(true);
    });

    it("lets a manager manage only the variants granted to them", () => {
        expect(canManageVariant(managerMe, "flowaim")).toBe(true);
        expect(canManageVariant(managerMe, "droid-rebalance")).toBe(false);
    });

    it("does not let someone with a grant but no role manage the variant", () => {
        expect(canManageVariant(buildMe({ role: null, grants: ["flowaim"] }), "flowaim")).toBe(
            false,
        );
    });

    it("does not let nobody manage anything", () => {
        expect(canManageVariant(null, "flowaim")).toBe(false);
    });
});
