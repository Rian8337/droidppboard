/**
 * An unsuccessful response from the server, or a failure to reach it.
 */
export class ApiError extends Error {
    /**
     * @param status The HTTP status, or `0` if the server could not be reached.
     * @param message A message that is fit to show to the person.
     * @param retryAfterSeconds How long to wait before trying again, if the server said so
     * (it does on `429`).
     */
    constructor(
        readonly status: number,
        message: string,
        readonly retryAfterSeconds?: number,
    ) {
        super(message);

        this.name = "ApiError";
    }
}

/**
 * Obtains the message of an error body. Broker errors look like `{ error: { code, message } }`
 * and the server's own like `{ message }`, and both name what went wrong, so they are shown as
 * they are.
 */
function getBodyMessage(body: unknown): string | null {
    if (typeof body !== "object" || body === null) {
        return null;
    }

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

    return null;
}

function getErrorMessage(status: number, body: unknown): string {
    const message = getBodyMessage(body);

    if (message !== null) {
        return message;
    }

    if (status === 429) {
        return "You are being rate limited. Please try again later";
    }

    return `Request failed with status ${status}`;
}

function parseRetryAfter(value: string | null): number | undefined {
    // Only the delay-seconds form is used by the server; an HTTP date is ignored.
    if (value === null || !/^\d+$/.test(value.trim())) {
        return undefined;
    }

    return parseInt(value, 10);
}

/**
 * Sends a request to the server and parses its JSON response.
 *
 * @param method The HTTP method.
 * @param path The path, starting with `/api`. Dynamic segments must be encoded with
 * `encodeURIComponent`.
 * @param body The body, if any: `FormData` is sent as it is, anything else as JSON.
 * @returns The parsed body, or `undefined` if the response has none (such as `204`).
 * @throws An {@link ApiError} if the response is not a 2xx or the server cannot be reached.
 */
export async function requestJson<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
): Promise<T> {
    let response: Response;

    try {
        response = await fetch(path, {
            method,
            credentials: "same-origin",
            headers:
                body === undefined || body instanceof FormData
                    ? undefined
                    : { "Content-Type": "application/json" },
            body:
                body === undefined
                    ? undefined
                    : body instanceof FormData
                      ? body
                      : JSON.stringify(body),
        });
    } catch {
        throw new ApiError(0, "Could not reach the server");
    }

    const text = await response.text().catch(() => "");
    let parsed: unknown;

    if (text !== "") {
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = undefined;
        }
    }

    if (!response.ok) {
        throw new ApiError(
            response.status,
            getErrorMessage(response.status, parsed),
            response.status === 429
                ? parseRetryAfter(response.headers.get("Retry-After"))
                : undefined,
        );
    }

    return parsed as T;
}
