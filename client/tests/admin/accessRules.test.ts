import { canGrantTo, canRemoveGrant } from "../../src/admin/accessRules";
import { adminMe, buildMe, managerMe } from "../mocks/fixtures";

describe("canRemoveGrant", () => {
    it("lets an admin remove anyone, even themselves", () => {
        expect(canRemoveGrant(adminMe, { uid: 50, role: null })).toBe(true);
        expect(canRemoveGrant(adminMe, { uid: 51, role: "manager" })).toBe(true);
        expect(canRemoveGrant(adminMe, { uid: 52, role: "admin" })).toBe(true);
        expect(canRemoveGrant(adminMe, { uid: adminMe.uid, role: "admin" })).toBe(true);
    });

    it("lets a manager remove a person who has no role", () => {
        expect(canRemoveGrant(managerMe, { uid: 50, role: null })).toBe(true);
    });

    it("keeps a manager from removing a manager, an admin or themselves", () => {
        expect(canRemoveGrant(managerMe, { uid: 51, role: "manager" })).toBe(false);
        expect(canRemoveGrant(managerMe, { uid: 52, role: "admin" })).toBe(false);
        expect(canRemoveGrant(managerMe, { uid: managerMe.uid, role: "manager" })).toBe(false);
        expect(canRemoveGrant(managerMe, { uid: managerMe.uid, role: null })).toBe(false);
    });

    it("lets a person without a role remove nobody", () => {
        expect(canRemoveGrant(buildMe(), { uid: 50, role: null })).toBe(false);
    });
});

describe("canGrantTo", () => {
    it("lets an admin grant to anyone", () => {
        expect(canGrantTo(adminMe, null)).toBe(true);
        expect(canGrantTo(adminMe, "manager")).toBe(true);
        expect(canGrantTo(adminMe, "admin")).toBe(true);
    });

    it("lets a manager grant only to a person who has no role", () => {
        expect(canGrantTo(managerMe, null)).toBe(true);
        expect(canGrantTo(managerMe, "manager")).toBe(false);
        expect(canGrantTo(managerMe, "admin")).toBe(false);
    });

    it("lets a person without a role grant to nobody", () => {
        expect(canGrantTo(buildMe(), null)).toBe(false);
    });
});
