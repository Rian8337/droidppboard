import {
    canChangeRole,
    canGrantTo,
    canRemoveGrant,
    getSettableRoles,
} from "../../src/admin/accessRules";
import { adminMe, buildMe, managerMe, ownerMe } from "../mocks/fixtures";

describe("canRemoveGrant", () => {
    it("lets an admin remove anyone, even themselves", () => {
        expect(canRemoveGrant(adminMe, { uid: 50, role: null })).toBe(true);
        expect(canRemoveGrant(adminMe, { uid: 51, role: "manager" })).toBe(true);
        expect(canRemoveGrant(adminMe, { uid: 52, role: "admin" })).toBe(true);
        expect(canRemoveGrant(adminMe, { uid: adminMe.uid, role: "admin" })).toBe(true);
    });

    it("lets an owner remove anyone", () => {
        expect(canRemoveGrant(ownerMe, { uid: 52, role: "admin" })).toBe(true);
        expect(canRemoveGrant(ownerMe, { uid: 53, role: "owner" })).toBe(true);
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
        expect(canGrantTo(adminMe, "owner")).toBe(true);
    });

    it("lets an owner grant to anyone", () => {
        expect(canGrantTo(ownerMe, null)).toBe(true);
        expect(canGrantTo(ownerMe, "owner")).toBe(true);
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

describe("canChangeRole", () => {
    it("lets an owner change an admin, a manager, or someone without a role", () => {
        expect(canChangeRole(ownerMe, "admin")).toBe(true);
        expect(canChangeRole(ownerMe, "manager")).toBe(true);
        expect(canChangeRole(ownerMe, null)).toBe(true);
    });

    it("lets an admin change only a manager or someone without a role", () => {
        expect(canChangeRole(adminMe, "manager")).toBe(true);
        expect(canChangeRole(adminMe, null)).toBe(true);
        expect(canChangeRole(adminMe, "admin")).toBe(false);
    });

    it("lets nobody change an owner", () => {
        expect(canChangeRole(ownerMe, "owner")).toBe(false);
        expect(canChangeRole(adminMe, "owner")).toBe(false);
    });

    it("lets a manager or a person without a role change nobody", () => {
        expect(canChangeRole(managerMe, null)).toBe(false);
        expect(canChangeRole(buildMe(), null)).toBe(false);
    });
});

describe("getSettableRoles", () => {
    it("lets an owner give the admin and manager roles", () => {
        expect(getSettableRoles(ownerMe)).toEqual(["admin", "manager"]);
    });

    it("lets an admin give only the manager role", () => {
        expect(getSettableRoles(adminMe)).toEqual(["manager"]);
    });

    it("lets a manager or a person without a role give none", () => {
        expect(getSettableRoles(managerMe)).toEqual([]);
        expect(getSettableRoles(buildMe())).toEqual([]);
    });
});
