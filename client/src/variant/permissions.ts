import type { Me } from "../api/auth";

/** Whether the person is an admin. */
export function isAdmin(me: Me | null): boolean {
    return me?.role === "admin";
}

/** Whether the person may manage a variant: an admin, or a manager who was granted it. */
export function canManageVariant(me: Me | null, variantName: string): boolean {
    return isAdmin(me) || (me?.role === "manager" && me.grants.includes(variantName));
}
