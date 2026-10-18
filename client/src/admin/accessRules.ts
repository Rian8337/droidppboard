import type { Me } from "../api/auth";
import type { ManageRole } from "../api/manage";

/**
 * Whether the person may remove the target's access to a variant. The broker enforces the same rule: admins may
 * remove anyone's, managers only the access of people with no role, and never their own.
 *
 * @param me The person asking.
 * @param target Who would lose access, with their role (`null` for none).
 */
export function canRemoveGrant(me: Me, target: { uid: number; role: ManageRole | null }): boolean {
    if (me.role === "admin") {
        return true;
    }

    return me.role === "manager" && target.uid !== me.uid && target.role === null;
}

/**
 * Whether the person may give a person with `targetRole` access to a variant: admins anyone, managers only people
 * with no role. A manager's own role is never `null`, so they cannot grant themselves either.
 */
export function canGrantTo(me: Me, targetRole: ManageRole | null): boolean {
    return me.role === "admin" || (me.role === "manager" && targetRole === null);
}
