/**
 * Types and thin `fetch` wrappers for the server's recalculation queue API (`/api/recalc/*`),
 * along with the helpers that format its numbers for display.
 */

export interface RecalcResult<T = unknown> {
    /**
     * Whether the request was answered with a 2xx status.
     */
    readonly ok: boolean;

    /**
     * The HTTP status, or `0` if the server could not be reached.
     */
    readonly status: number;

    /**
     * The parsed JSON body, or `null` if there is none (such as for `204`).
     */
    readonly body: T | null;
}

/**
 * Sends a request to the recalculation queue API.
 *
 * @param method The HTTP method.
 * @param path The path below `/api/recalc`, starting with a slash. Dynamic segments must be
 * encoded with `encodeURIComponent`.
 * @param body The JSON body, if any.
 */
export async function recalcRequest<T = unknown>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown
): Promise<RecalcResult<T>> {
    try {
        const res = await fetch(`/api/recalc${path}`, {
            method,
            headers:
                body === undefined
                    ? undefined
                    : { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        const parsed: unknown = await res.json().catch(() => null);

        return { ok: res.ok, status: res.status, body: parsed as T | null };
    } catch {
        return { ok: false, status: 0, body: null };
    }
}

/**
 * Obtains a message to show for an unsuccessful result. The server's errors look like
 * `{ message }`, and name the limit that was hit, so that message is shown as it is.
 */
export function getRecalcErrorMessage(result: RecalcResult): string {
    if (result.status === 0) {
        return "Unable to reach the server. Please try again";
    }

    const body = result.body;

    if (
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
    ) {
        return body.message;
    }

    if (result.status === 429) {
        return "You are being rate limited. Please try again later";
    }

    return `Request failed with status ${result.status}`;
}

/**
 * Formats the estimated wait of a newly queued player.
 *
 * @param seconds The estimate, which may be fractional, or `null` if it is unknown.
 */
export function formatEstimatedWait(seconds: number | null): string {
    if (seconds === null || !Number.isFinite(seconds)) {
        return "unknown";
    }

    const minutes = Math.round(seconds / 60);

    if (seconds < 60 || minutes < 1) {
        return "under a minute";
    }

    if (minutes < 120) {
        return `~${minutes} min`;
    }

    return `~${Math.round(minutes / 60)} h`;
}

/**
 * Formats a cooldown as `m:ss`.
 *
 * @param seconds The seconds left, which may be fractional.
 */
export function formatCooldown(seconds: number): string {
    const whole = Math.max(0, Math.ceil(seconds));

    return `${Math.floor(whole / 60)}:${(whole % 60)
        .toString()
        .padStart(2, "0")}`;
}

/**
 * Formats how long ago something happened.
 *
 * @param time The time, in milliseconds since the epoch.
 * @param now The current time, in milliseconds since the epoch.
 */
export function formatAge(time: number, now: number): string {
    const seconds = Math.max(0, Math.round((now - time) / 1000));

    if (seconds < 60) {
        return "just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes} min ago`;
    }

    const hours = Math.floor(minutes / 60);

    return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
}
