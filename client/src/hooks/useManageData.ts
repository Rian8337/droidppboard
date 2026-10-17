import { useCallback, useEffect, useRef, useState } from "react";
import {
    ManageResult,
    fetchUsernames,
    getManageErrorMessage,
    manageRequest,
} from "../utils/manageApi";

/**
 * Loads data from the management API with a `GET` request.
 *
 * @param path The path below `/api/manage`.
 */
export function useManageData<T>(path: string) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | undefined>();
    const [isLoading, setLoading] = useState(true);
    const requestId = useRef(0);

    const reload = useCallback(async () => {
        const id = ++requestId.current;
        const result = await manageRequest<T>("GET", path);

        // A newer request was made, or the component is gone.
        if (id !== requestId.current) {
            return;
        }

        if (result.ok && result.body !== null) {
            setData(result.body);
            setError(undefined);
        } else {
            setError(getManageErrorMessage(result));
        }

        setLoading(false);
    }, [path]);

    // Makes responses of requests that are still in flight be ignored.
    const cancel = useCallback(() => {
        requestId.current++;
    }, []);

    useEffect(() => {
        setLoading(true);
        reload();

        return cancel;
    }, [reload, cancel]);

    return { data, error, isLoading, reload };
}

/**
 * Runs writes against the management API, reloading data after each successful one.
 *
 * @param reload Reloads the data of the page.
 */
export function useManageAction(reload: () => Promise<void>) {
    const [error, setError] = useState<string | undefined>();
    const [isBusy, setBusy] = useState(false);

    const run = useCallback(
        async (write: () => Promise<ManageResult>): Promise<boolean> => {
            setBusy(true);
            setError(undefined);

            const result = await write();

            if (result.ok) {
                await reload();
            } else {
                setError(getManageErrorMessage(result));
            }

            setBusy(false);

            return result.ok;
        },
        [reload]
    );

    return { run, error, isBusy };
}

/**
 * Looks up usernames for uids.
 *
 * @param uids The uids.
 * @returns A map of uid to username; uids that are not (yet) known are absent.
 */
export function useUsernames(uids: readonly number[]): Map<number, string> {
    const [usernames, setUsernames] = useState(new Map<number, string>());
    const key = [...new Set(uids)].sort((a, b) => a - b).join(",");

    useEffect(() => {
        let cancelled = false;

        fetchUsernames(key ? key.split(",").map(Number) : []).then((map) => {
            if (!cancelled) {
                setUsernames(map);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [key]);

    return usernames;
}
