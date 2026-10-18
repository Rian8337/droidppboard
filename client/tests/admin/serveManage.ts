import { http, HttpResponse } from "msw";
import { buildQueueView, type AdminKeyData } from "../mocks/fixtures";
import { server } from "../mocks/server";
import type { FullRunView } from "app-structures";

export type RoleChoice = "admin" | "manager" | null;

export interface ServeManageOptions {
    /** The uids granted the variant. */
    grants?: number[];
    usernames?: Record<number, string>;
    /** The role of each person; a person who is absent has none. */
    roles?: Record<number, RoleChoice>;
    keys?: AdminKeyData[];
    fullRuns?: FullRunView[];
}

export interface SentRequest {
    method: string;
    path: string;
    body: unknown;
}

/**
 * Serves the management and full-run endpoints the Admin tab uses, and records every request that changes something.
 */
export function serveManage({
    grants = [],
    usernames = {},
    roles = {},
    keys = [],
    fullRuns = [],
}: ServeManageOptions = {}) {
    const sent: SentRequest[] = [];

    async function record(request: Request): Promise<void> {
        const text = await request.text();

        sent.push({
            method: request.method,
            path: new URL(request.url).pathname,
            body: text === "" ? undefined : JSON.parse(text),
        });
    }

    const respondNoContent = async ({ request }: { request: Request }) => {
        await record(request);

        return new HttpResponse(null, { status: 204 });
    };

    server.use(
        http.get("/api/manage/variants/:name/grants", () => HttpResponse.json(grants)),
        http.get("/api/manage/usernames", ({ request }) => {
            const uids = (new URL(request.url).searchParams.get("uids") ?? "").split(",");

            return HttpResponse.json(
                Object.fromEntries(
                    uids.flatMap((uid) =>
                        usernames[Number(uid)] === undefined ? [] : [[uid, usernames[Number(uid)]]],
                    ),
                ),
            );
        }),
        http.get("/api/manage/user-roles", ({ request }) => {
            const uids = (new URL(request.url).searchParams.get("uids") ?? "")
                .split(",")
                .map(Number);

            return HttpResponse.json(uids.map((uid) => ({ uid, role: roles[uid] ?? null })));
        }),
        http.get("/api/manage/keys", () => HttpResponse.json(keys)),
        http.put("/api/manage/variants/:name/grants/:uid", respondNoContent),
        http.delete("/api/manage/variants/:name/grants/:uid", respondNoContent),
        http.put("/api/manage/aliases/:alias", respondNoContent),
        http.delete("/api/manage/aliases/:alias", respondNoContent),
        http.put("/api/manage/keys/:name/grants/:variant", respondNoContent),
        http.delete("/api/manage/keys/:name/grants/:variant", respondNoContent),
        http.patch("/api/manage/variants/:name", async ({ request }) => {
            await record(request);

            return HttpResponse.json({});
        }),
        http.get("/api/recalc/queue", ({ request }) =>
            HttpResponse.json(
                buildQueueView({
                    variant: new URL(request.url).searchParams.get("variant"),
                    fullRuns,
                    canManageFullRuns: true,
                }),
            ),
        ),
        http.post("/api/recalc/full-runs/:variant/start", respondNoContent),
        http.post("/api/recalc/full-runs/:variant/stop", respondNoContent),
    );

    return sent;
}
