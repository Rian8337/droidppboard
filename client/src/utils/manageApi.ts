/**
 * Types and thin `fetch` wrappers for the server's management API (`/api/manage/*`), which forwards
 * to the broker's admin routes as the logged in user.
 */

export type ManageRole = "admin" | "manager";

export interface AdminVariant {
    readonly name: string;
    readonly title: string | null;
    readonly aliases: readonly string[];
    readonly description: string | null;
    readonly available: boolean;
    readonly public: boolean;
    readonly instanceCount: number;
}

export interface AdminKey {
    readonly name: string;
    readonly rateLimitPerMinute: number | null;
    readonly allVariants: boolean;
    readonly canActForUsers: boolean;
    readonly grants: readonly string[];
    readonly createdAt: string;
    readonly revokedAt: string | null;
}

export interface AdminUser {
    readonly uid: number;
    readonly role: ManageRole | null;
    readonly grants: readonly string[];
}

export interface CreatedKeyResponse {
    readonly key: AdminKey;
    readonly rawKey: string;
}

export interface ManageResult<T = unknown> {
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

export const maxVariantTitleLength = 100;
export const maxVariantDescriptionLength = 4000;

/**
 * Sends a request to the management API.
 *
 * @param method The HTTP method.
 * @param path The path below `/api/manage`, starting with a slash. Dynamic segments must be
 * encoded with `encodeURIComponent`.
 * @param body The JSON body, if any.
 */
export async function manageRequest<T = unknown>(
    method: "GET" | "PUT" | "PATCH" | "POST" | "DELETE",
    path: string,
    body?: unknown
): Promise<ManageResult<T>> {
    try {
        const res = await fetch(`/api/manage${path}`, {
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
 * Obtains a message to show for an unsuccessful result. Broker errors look like
 * `{ error: { code, message } }`, and the server's own like `{ message }`.
 */
export function getManageErrorMessage(result: ManageResult): string {
    if (result.status === 0) {
        return "Unable to reach the server. Please try again";
    }

    if (result.status === 429) {
        return "You are being rate limited. Please try again later";
    }

    const body = result.body;

    if (typeof body === "object" && body !== null) {
        if (
            "error" in body &&
            typeof body.error === "object" &&
            body.error !== null &&
            "message" in body.error &&
            typeof body.error.message === "string"
        ) {
            return body.error.message;
        }

        if ("message" in body && typeof body.message === "string") {
            return body.message;
        }
    }

    return `Request failed with status ${result.status}`;
}

/**
 * Obtains the usernames of users.
 *
 * @param uids The uids to look up.
 * @returns A map of uid to username. Uids that are not known are absent.
 */
export async function fetchUsernames(
    uids: readonly number[]
): Promise<Map<number, string>> {
    const usernames = new Map<number, string>();
    const unique = [...new Set(uids)];

    // The server accepts at most 100 uids per request.
    for (let i = 0; i < unique.length; i += 100) {
        const chunk = unique.slice(i, i + 100);
        const result = await manageRequest<Record<string, unknown>>(
            "GET",
            `/usernames?uids=${chunk.join(",")}`
        );

        if (!result.ok || !result.body) {
            continue;
        }

        for (const [uid, username] of Object.entries(result.body)) {
            if (typeof username === "string") {
                usernames.set(parseInt(uid), username);
            }
        }
    }

    return usernames;
}
