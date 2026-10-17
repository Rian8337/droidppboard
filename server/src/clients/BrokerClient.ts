import { PPVariant } from "app-structures";

/**
 * The identity the broker knows an acting user by.
 */
export interface BrokerMe {
    uid: number;
    role: "admin" | "manager" | null;
    grants: string[];
}

/**
 * A broker response that is passed through to the caller.
 */
export interface BrokerForwardResponse {
    status: number;
    body: unknown;
}

/**
 * A client for the variant broker.
 */
export abstract class BrokerClient {
    private static readonly requestTimeoutMs = 10_000;

    /**
     * Gets the variants that are visible to a person, or to visitors if none is given.
     *
     * @param actingUid The uid of the person to act for.
     * @returns The variants, or `null` if they could not be fetched.
     */
    static async getVariants(actingUid?: number): Promise<PPVariant[] | null> {
        return this.getJson<PPVariant[]>("/variants", actingUid);
    }

    /**
     * Gets the broker's view of a person.
     *
     * @param actingUid The uid of the person.
     * @returns The person's role and grants, or `null` if they could not be fetched.
     */
    static async getMe(actingUid: number): Promise<BrokerMe | null> {
        return this.getJson<BrokerMe>("/me", actingUid);
    }

    /**
     * Forwards a request to the broker's admin API on behalf of a person.
     *
     * @param method The HTTP method.
     * @param path The path under `/admin`, which must start with `/`.
     * @param actingUid The uid of the person to act for.
     * @param body The JSON body, if any.
     * @returns The broker's status and JSON body, or a 502 if the broker could not be reached.
     */
    static async forwardAdmin(
        method: string,
        path: string,
        actingUid: number,
        body?: unknown,
    ): Promise<BrokerForwardResponse> {
        if (!path.startsWith("/") || path.includes("..")) {
            throw new Error("Invalid broker admin path");
        }

        try {
            const response = await fetch(this.url(`/admin${path}`), {
                method,
                headers: this.headers(actingUid, body !== undefined),
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: AbortSignal.timeout(this.requestTimeoutMs),
            });

            const text = await response.text();

            return {
                status: response.status,
                body: text ? (JSON.parse(text) as unknown) : null,
            };
        } catch (e) {
            console.error("Broker admin request failed:", e);

            return {
                status: 502,
                body: {
                    error: {
                        code: "BROKER_UNAVAILABLE",
                        message: "The variant service is unavailable",
                    },
                },
            };
        }
    }

    private static async getJson<T>(
        path: string,
        actingUid?: number,
    ): Promise<T | null> {
        try {
            const response = await fetch(this.url(path), {
                headers: this.headers(actingUid, false),
                signal: AbortSignal.timeout(this.requestTimeoutMs),
            });

            if (response.status !== 200) {
                return null;
            }

            return (await response.json()) as T;
        } catch (e) {
            console.error(`Broker request to ${path} failed:`, e);

            return null;
        }
    }

    private static url(path: string): string {
        return `${process.env.DPP_BROKER_URL!.replace(/\/+$/, "")}${path}`;
    }

    private static headers(
        actingUid: number | undefined,
        hasBody: boolean,
    ): Record<string, string> {
        const headers: Record<string, string> = {
            "X-Api-Key": process.env.DPP_BROKER_KEY!,
        };

        if (actingUid !== undefined) {
            headers["X-Acting-Uid"] = actingUid.toString();
        }

        if (hasBody) {
            headers["Content-Type"] = "application/json";
        }

        return headers;
    }
}
