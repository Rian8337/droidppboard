import { useState } from "react";
import { useMe } from "../api/auth";

/**
 * A key that changes whenever the person who is logged in becomes somebody else, including nobody.
 * Use it as the `key` of what must not outlive the person, such as a result calculated as them.
 * Finding out who is logged in for the first time does not change it, so what a person has already
 * typed survives the answer arriving.
 */
export function useSessionKey(): number {
    const { data: me = null, isPending } = useMe();
    const person = me?.uid ?? "visitor";
    const [session, setSession] = useState<{ person: number | string | null; key: number }>({
        person: null,
        key: 0,
    });

    if (!isPending && session.person !== person) {
        setSession({ person, key: session.person === null ? 0 : session.key + 1 });
    }

    return session.key;
}
