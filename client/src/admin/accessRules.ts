import type { Me } from "../api/auth";
import type { ManageRole, SettableRole } from "../api/manage";
import { isAdmin, isOwner } from "../variant/permissions";

/**
 * Whether the person may remove the target's access to a variant. The broker enforces the same rule: admins and
 * owners may remove anyone's, managers only the access of people with no role, and never their own.
 *
 * @param me The person asking.
 * @param target Who would lose access, with their role (`null` for none).
 */
export function canRemoveGrant(me: Me, target: { uid: number; role: ManageRole | null }): boolean {
    if (isAdmin(me)) {
        return true;
    }

    return me.role === "manager" && target.uid !== me.uid && target.role === null;
}

/**
 * Whether the person may give a person with `targetRole` access to a variant: admins and owners anyone, managers
 * only people with no role. A manager's own role is never `null`, so they cannot grant themselves either.
 */
export function canGrantTo(me: Me, targetRole: ManageRole | null): boolean {
    return isAdmin(me) || (me.role === "manager" && targetRole === null);
}

/**
 * Whether the person may change or remove the role of a person who has `targetRole`. The broker enforces the same
 * rule: nobody may change an owner on the site (owners are set on the broker's server), only an owner may change an
 * admin, and admins and owners may change a manager or give a role to someone without one. This also keeps an admin
 * from changing their own role, since only an owner may change an admin.
 */
export function canChangeRole(me: Me, targetRole: ManageRole | null): boolean {
    if (targetRole === "owner") {
        return false;
    }

    return targetRole === "admin" ? isOwner(me) : isAdmin(me);
}

/** The roles the person may give: an owner may give the admin role too, an admin only the manager role. */
export function getSettableRoles(me: Me): readonly SettableRole[] {
    if (isOwner(me)) {
        return ["admin", "manager"];
    }

    return isAdmin(me) ? ["manager"] : [];
}
