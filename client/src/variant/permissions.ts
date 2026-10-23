import type { Me } from "../api/auth";

/** Whether a role is admin or above. An owner can do everything an admin can. */
export function isAdminRole(role: Me["role"] | undefined): boolean {
    return role === "admin" || role === "owner";
}

/** Whether the person is an admin or an owner. */
export function isAdmin(me: Me | null): boolean {
    return isAdminRole(me?.role);
}

/** Whether the person is an owner, the only role that may manage API keys and admins. */
export function isOwner(me: Me | null): boolean {
    return me?.role === "owner";
}

/** Whether the person may manage a variant: an admin or owner, or a manager who was granted it. */
export function canManageVariant(me: Me | null, variantName: string): boolean {
    return isAdmin(me) || (me?.role === "manager" && me.grants.includes(variantName));
}
