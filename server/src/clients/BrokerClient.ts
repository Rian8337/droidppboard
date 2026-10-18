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

    // A calculation renders a strain chart, which takes longer than a lookup.
    private static readonly performanceTimeoutMs = 30_000;

    /**
     * Admin paths are made up of segments of letters, digits, `_` and `-`, as broker names,
     * aliases and uids are.
     */
    private static readonly adminPathPattern = /^(\/[A-Za-z0-9_-]+)+$/;

    /**
     * Checks whether a path is one that can be forwarded to the broker's admin API.
     *
     * @param path The path under `/admin`.
     * @returns Whether the path starts with `/` and consists of plain name segments.
     */
    static isValidAdminPath(path: string): boolean {
        return BrokerClient.adminPathPattern.test(path);
    }

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
     * Gets one variant as a person sees it.
     *
     * @param name The name or alias of the variant.
     * @param actingUid The uid of the person to act for.
     * @returns The variant, or `null` if it is not visible to the person or could not be fetched.
     */
    static async getVariant(
        name: string,
        actingUid?: number,
    ): Promise<PPVariant | null> {
        let path: string;

        try {
            path = `/variants/${encodeURIComponent(name)}`;
        } catch {
            return null;
        }

        return this.getJson<PPVariant>(path, actingUid);
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
     * @param path The path under `/admin`, which must start with `/` and consist of plain name segments.
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
        const url = this.adminUrl(path);

        let response: Response;

        try {
            response = await fetch(url.href, {
                method,
                headers: this.headers(actingUid, body !== undefined),
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: AbortSignal.timeout(this.requestTimeoutMs),
            });
        } catch (e) {
            console.error("Broker admin request failed:", e);

            return this.unavailable();
        }

        try {
            const text = await response.text();

            return {
                status: response.status,
                body: text ? (JSON.parse(text) as unknown) : null,
            };
        } catch {
            // The error is deliberately not logged: it can embed part of the response body.
            console.error(
                `Broker returned an unreadable body for ${method} /admin${path}`,
            );

            return this.unavailable();
        }
    }

    /**
     * Asks a variant to calculate the difficulty and performance of a score on behalf of a person.
     *
     * @param variant The name of the variant.
     * @param body The JSON body of the broker's performance request.
     * @param actingUid The uid of the person to act for, which private variants need.
     * @returns The broker's status and JSON body, or a 502 if the broker could not be reached.
     */
    static async calculatePerformance(
        variant: string,
        body: unknown,
        actingUid?: number,
    ): Promise<BrokerForwardResponse> {
        const path = `/variants/${encodeURIComponent(variant)}/performance`;

        try {
            const response = await fetch(this.url(path), {
                method: "POST",
                headers: this.headers(actingUid, true),
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(this.performanceTimeoutMs),
            });
            const text = await response.text();

            return {
                status: response.status,
                body: text ? (JSON.parse(text) as unknown) : null,
            };
        } catch (e) {
            // Only the kind of error is logged, as its message can embed the URL.
            console.error(
                "Broker performance request failed:",
                e instanceof Error ? e.name : typeof e,
            );

            return this.unavailable();
        }
    }

    private static unavailable(): BrokerForwardResponse {
        return {
            status: 502,
            body: {
                error: {
                    code: "BROKER_UNAVAILABLE",
                    message: "The rework service is unavailable",
                },
            },
        };
    }

    /**
     * Builds the URL of an admin endpoint, ensuring it cannot resolve outside `/admin`.
     *
     * @param path The path under `/admin`.
     * @returns The URL.
     * @throws If the path is not made up of plain name segments or resolves outside `/admin`.
     */
    private static adminUrl(path: string): URL {
        if (!BrokerClient.isValidAdminPath(path)) {
            throw new Error("Invalid broker admin path");
        }

        const base = new URL(this.url(""));
        const url = new URL(this.url(`/admin${path}`));
        const adminPath = `${base.pathname.replace(/\/+$/, "")}/admin`;

        if (
            url.origin !== base.origin ||
            url.search ||
            url.hash ||
            (url.pathname !== adminPath &&
                !url.pathname.startsWith(`${adminPath}/`))
        ) {
            throw new Error("Invalid broker admin path");
        }

        return url;
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
            // Only the kind of error is logged, as its message can embed the URL.
            console.error(
                `Broker request to ${path} failed:`,
                e instanceof Error ? e.name : typeof e,
            );

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
