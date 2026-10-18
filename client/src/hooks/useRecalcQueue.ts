import { RecalcQueueView } from "app-structures";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRecalcErrorMessage, recalcRequest } from "../utils/recalcApi";

const pollIntervalMs = 3000;

/**
 * Loads the recalculation queue and keeps it up to date while the page is visible.
 *
 * @param variant The name of the variant to show, or `null` for the global queue. The view is
 * cleared when this changes, so a view is never shown for another variant than the one asked for.
 */
export function useRecalcQueue(variant: string | null): {
    view: RecalcQueueView | null;
    error: string | undefined;
    reload(): void;
} {
    const [view, setView] = useState<RecalcQueueView | null>(null);
    const [error, setError] = useState<string | undefined>();
    const requestId = useRef(0);
    const isPolling = useRef(false);

    const load = useCallback(async () => {
        const id = ++requestId.current;
        const result = await recalcRequest<RecalcQueueView>(
            "GET",
            variant === null
                ? "/queue"
                : `/queue?variant=${encodeURIComponent(variant)}`
        );

        // A newer request was made, or the variant changed or the component is gone.
        if (id !== requestId.current) {
            return;
        }

        if (result.ok && result.body !== null) {
            setView(result.body);
            setError(undefined);
        } else {
            setError(getRecalcErrorMessage(result));
        }
    }, [variant]);

    // Makes responses of requests that are still in flight be ignored.
    const cancel = useCallback(() => {
        requestId.current++;
    }, []);

    useEffect(() => {
        setView(null);
        setError(undefined);
        load();

        // A slow response must not pile up requests, so a poll is skipped while one is in flight.
        const poll = async () => {
            if (document.visibilityState !== "visible" || isPolling.current) {
                return;
            }

            isPolling.current = true;

            try {
                await load();
            } finally {
                isPolling.current = false;
            }
        };

        const timer = setInterval(poll, pollIntervalMs);

        // Catches up right away when the person comes back to the tab.
        document.addEventListener("visibilitychange", poll);

        return () => {
            cancel();
            clearInterval(timer);
            document.removeEventListener("visibilitychange", poll);
        };
    }, [load, cancel]);

    const reload = useCallback(() => {
        load();
    }, [load]);

    return { view, error, reload };
}
