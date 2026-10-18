import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RecalcQueueView } from "app-structures";
import { http, HttpResponse } from "msw";
import { createQueryClient } from "../../src/api/queryClient";
import { queryKeys } from "../../src/api/queryKeys";
import { recalcBackgroundPollIntervalMs, recalcPollIntervalMs } from "../../src/api/recalc";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { QueueTab } from "../../src/queue/QueueTab";
import {
    adminMe,
    buildFullRun,
    buildQueueEntry,
    buildQueueView,
    droidRebalance,
    plainMe,
    readingVariant,
} from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders, type RenderWithProvidersOptions } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

const allowance = { active: 0, maxActive: 3, cooldownRemainingSeconds: 0 };

interface FakeQueue {
    /** What the variant's queue answers; change it to change what the next request gets. */
    view: RecalcQueueView;
    /** What the global queue answers. */
    globalView: RecalcQueueView;
    /** The URL of every `GET /api/recalc/queue`. */
    requests: URL[];
}

/** Serves the queue from `view` and `globalView`, and records the requests. */
function serveQueue(view: Partial<RecalcQueueView> = {}, globalView?: Partial<RecalcQueueView>) {
    const fake: FakeQueue = {
        view: buildQueueView(view),
        globalView: buildQueueView({ variant: null, ...globalView }),
        requests: [],
    };

    server.use(
        http.get("/api/recalc/queue", ({ request }) => {
            const url = new URL(request.url);
            fake.requests.push(url);

            return HttpResponse.json(url.searchParams.has("variant") ? fake.view : fake.globalView);
        }),
    );

    return fake;
}

function renderTab(me?: RenderWithProvidersOptions["me"]) {
    return renderWithProviders(<QueueTab variant={droidRebalance} />, {
        route: "/v/droid-rebalance/queue",
        me,
    });
}

const mrekk = buildQueueEntry({
    id: "e1",
    uid: 11,
    username: "mrekk",
    status: "calculating",
    position: null,
    progress: { done: 20, total: 100 },
});
const cryshina = buildQueueEntry({
    id: "e2",
    uid: 12,
    username: "cryshina",
    queuedByUid: plainMe.uid,
    queuedByUsername: "player",
    position: 1,
});
const akolibed = buildQueueEntry({
    id: "e3",
    uid: 13,
    username: "Akolibed",
    queuedByUid: 77,
    queuedByUsername: "someone",
    position: 2,
});
const milosz = buildQueueEntry({
    id: "e4",
    uid: 14,
    username: "milosz",
    status: "done",
    position: null,
    livePPTotal: 100,
    localPPTotal: 110.5,
    finishedAt: 1_790_000_000_000,
});
const lifeline = buildQueueEntry({
    id: "e5",
    uid: 15,
    username: "lifeline",
    status: "failed",
    position: null,
    failureReason: "Player not found",
    finishedAt: 1_790_000_000_000,
});

function getQueueSection() {
    return screen.getByRole("region", { name: "Queue" });
}

function getRecentSection() {
    return screen.getByRole("region", { name: "Recently finished" });
}

describe("QueueTab", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    describe("the lists", () => {
        it("lists running then waiting entries in the queue and never mixes in finished ones", async () => {
            serveQueue({
                queue: [mrekk, cryshina, akolibed],
                recent: [milosz, lifeline],
            });

            renderTab();

            const queue = within(await screen.findByRole("region", { name: "Queue" }));

            const players = queue
                .getAllByRole("row")
                .slice(1)
                .map((row) => within(row).getAllByRole("cell")[1].textContent);

            expect(players).toEqual(["mrekk", "cryshina", "Akolibed"]);
            expect(queue.queryByText("milosz")).not.toBeInTheDocument();
            expect(queue.queryByText("lifeline")).not.toBeInTheDocument();
            expect(queue.getByText(/1 running, 2 waiting/)).toBeVisible();
        });

        it("drops a finished entry that the queue holds", async () => {
            serveQueue({ queue: [mrekk, milosz] });

            renderTab();

            await screen.findByText("mrekk");

            expect(within(getQueueSection()).queryByText("milosz")).not.toBeInTheDocument();
        });

        it("shows position, who queued and the status of each entry", async () => {
            serveQueue({ queue: [mrekk, cryshina] });

            renderTab();

            const running = within(await screen.findByRole("row", { name: /mrekk/ }));
            const waiting = within(screen.getByRole("row", { name: /cryshina/ }));

            expect(running.getByText("Calculating")).toBeVisible();
            expect(running.getByText("20/100 scores")).toBeVisible();
            expect(waiting.getAllByRole("cell")[0]).toHaveTextContent("1");
            expect(waiting.getByText("player")).toBeVisible();
            expect(waiting.getByText("Waiting")).toBeVisible();
        });

        it("keeps recently finished entries in their own section with the result", async () => {
            serveQueue({ queue: [mrekk], recent: [milosz, lifeline] });

            renderTab();

            const recent = within(await screen.findByRole("region", { name: "Recently finished" }));

            expect(recent.getByText("milosz")).toBeVisible();
            expect(recent.getByText("Done")).toBeVisible();
            expect(recent.getByText("100.00pp → 110.50pp")).toBeVisible();
            expect(recent.getByText("lifeline")).toBeVisible();
            expect(recent.getByText("Failed")).toBeVisible();
            expect(recent.getByText("Player not found")).toBeVisible();
            expect(recent.queryByText("mrekk")).not.toBeInTheDocument();
        });

        it("says so when nothing is queued or finished", async () => {
            serveQueue();

            renderTab();

            expect(await screen.findByText("The queue is empty.")).toBeVisible();
            expect(screen.getByText("Nothing has finished recently.")).toBeVisible();
        });

        it("shows the estimated wait of the variant", async () => {
            serveQueue({ estimatedWaitSeconds: 150 });

            renderTab();

            expect(await screen.findByText(/Estimated wait: ~3 min/)).toBeVisible();
        });

        it("shows an error with a retry when the queue cannot be loaded", async () => {
            server.use(
                http.get("/api/recalc/queue", () =>
                    HttpResponse.json(
                        { message: "The variant service is unavailable" },
                        { status: 503 },
                    ),
                ),
            );

            renderTab();

            expect(await screen.findByText("The variant service is unavailable")).toBeVisible();

            server.use(
                http.get("/api/recalc/queue", () =>
                    HttpResponse.json(buildQueueView({ queue: [mrekk] })),
                ),
            );

            await userEvent.click(screen.getByRole("button", { name: "Try again" }));

            expect(await screen.findByText("mrekk")).toBeVisible();
        });

        it("asks for the queue of the variant", async () => {
            const fake = serveQueue();

            renderTab();

            await screen.findByText("The queue is empty.");

            expect(fake.requests.map((url) => url.searchParams.get("variant"))).toEqual([
                "droid-rebalance",
            ]);
        });
    });

    describe("Show all variants", () => {
        it("requests the global queue and tags each entry with its variant", async () => {
            const fake = serveQueue(
                { queue: [cryshina] },
                {
                    queue: [
                        cryshina,
                        buildQueueEntry({
                            id: "e9",
                            uid: 19,
                            username: "otherplayer",
                            variant: "reading",
                        }),
                    ],
                },
            );

            renderTab();

            await screen.findByText("cryshina");
            expect(screen.queryByText("otherplayer")).not.toBeInTheDocument();

            await userEvent.click(screen.getByRole("checkbox", { name: "Show all variants" }));

            expect(await screen.findByText("otherplayer")).toBeVisible();
            expect(fake.requests.some((url) => !url.searchParams.has("variant"))).toBe(true);
            expect(within(getQueueSection()).getByText("Reading")).toBeVisible();
            expect(within(getQueueSection()).getAllByText("Rebalance").length).toBeGreaterThan(0);
        });

        it("goes back to the queue of the variant when switched off", async () => {
            serveQueue(
                { queue: [cryshina] },
                {
                    queue: [
                        cryshina,
                        buildQueueEntry({ id: "e9", username: "otherplayer", variant: "reading" }),
                    ],
                },
            );

            renderTab();

            await userEvent.click(
                await screen.findByRole("checkbox", { name: "Show all variants" }),
            );
            await screen.findByText("otherplayer");
            await userEvent.click(screen.getByRole("checkbox", { name: "Show all variants" }));

            await waitFor(() => {
                expect(screen.queryByText("otherplayer")).not.toBeInTheDocument();
            });
        });

        it("polls only the listed view every few seconds", async () => {
            serveQueue();
            const queryClient = createQueryClient({ retry: false });

            renderWithProviders(<QueueTab variant={droidRebalance} />, {
                route: "/v/droid-rebalance/queue",
                queryClient,
            });

            await screen.findByText("The queue is empty.");

            function getPollInterval(variant: string | null) {
                const options = queryClient
                    .getQueryCache()
                    .find({ queryKey: queryKeys.recalcQueue(variant) })?.observers[0]?.options;

                return typeof options?.refetchInterval === "number"
                    ? options.refetchInterval
                    : undefined;
            }

            expect(getPollInterval("droid-rebalance")).toBe(recalcPollIntervalMs);

            await userEvent.click(screen.getByRole("checkbox", { name: "Show all variants" }));

            await waitFor(() => expect(getPollInterval(null)).toBe(recalcPollIntervalMs));
            expect(getPollInterval("droid-rebalance")).toBe(recalcBackgroundPollIntervalMs);
        });

        it("does not ask for the global queue until it is switched on", async () => {
            const fake = serveQueue();

            renderTab();

            await screen.findByText("The queue is empty.");

            expect(fake.requests.every((url) => url.searchParams.has("variant"))).toBe(true);
        });
    });

    describe("the full run strip", () => {
        it("shows progress of a running full run", async () => {
            serveQueue({ fullRuns: [buildFullRun()] });

            renderTab();

            const strip = within(
                await screen.findByRole("region", { name: "Recalculating all players" }),
            );

            expect(strip.getByText("1,240 of 8,912 players done")).toBeVisible();
            expect(strip.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1240");
            expect(strip.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "8912");
            expect(strip.getByText(/Started by admin/)).toBeVisible();
            expect(strip.queryByText(/failed/)).not.toBeInTheDocument();
        });

        it("is absent when no full run is going", async () => {
            serveQueue({ queue: [mrekk] });

            renderTab();

            await screen.findByText("mrekk");

            expect(screen.queryByText("Recalculating all players")).not.toBeInTheDocument();
        });

        it.each(["stopped", "finished"] as const)("is absent for a %s run", async (status) => {
            serveQueue({ queue: [mrekk], fullRuns: [buildFullRun({ status })] });

            renderTab();

            await screen.findByText("mrekk");

            expect(screen.queryByText("Recalculating all players")).not.toBeInTheDocument();
        });

        it("is absent when only another variant has a run", async () => {
            serveQueue({
                queue: [mrekk],
                fullRuns: [buildFullRun({ variant: readingVariant.name })],
            });

            renderTab();

            await screen.findByText("mrekk");

            expect(screen.queryByText("Recalculating all players")).not.toBeInTheDocument();
        });

        it("shows how many players failed in this run", async () => {
            serveQueue({ fullRuns: [buildFullRun({ failed: 12 })] });

            renderTab();

            expect(await screen.findByText("12 failed in this run")).toBeVisible();
        });

        it("shows a paused state when the variant is unavailable", async () => {
            serveQueue({ fullRuns: [buildFullRun({ status: "paused" })] });

            renderTab();

            expect(
                await screen.findByText(/Paused while this variant is unavailable/),
            ).toBeVisible();
            expect(screen.getByText("Recalculating all players")).toBeVisible();
        });

        it("offers Stop to people who can manage full runs", async () => {
            serveQueue({ fullRuns: [buildFullRun()], canManageFullRuns: true });

            renderTab(adminMe);

            expect(await screen.findByRole("button", { name: "Stop" })).toBeVisible();
        });

        it("has no Stop for anybody else", async () => {
            serveQueue({ fullRuns: [buildFullRun()], canManageFullRuns: false });

            renderTab(plainMe);

            await screen.findByText("1,240 of 8,912 players done");

            expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
        });

        it("stops the run of the variant and reloads", async () => {
            const fake = serveQueue({ fullRuns: [buildFullRun()], canManageFullRuns: true });
            const stops: string[] = [];

            server.use(
                http.post("/api/recalc/full-runs/:variant/stop", ({ params }) => {
                    stops.push(String(params.variant));
                    fake.view = { ...fake.view, fullRuns: [buildFullRun({ status: "stopped" })] };

                    return new HttpResponse(null, { status: 204 });
                }),
            );

            renderTab(adminMe);

            await userEvent.click(await screen.findByRole("button", { name: "Stop" }));

            await waitFor(() => {
                expect(screen.queryByText("Recalculating all players")).not.toBeInTheDocument();
            });
            expect(stops).toEqual(["droid-rebalance"]);
        });

        it("shows why Stop failed", async () => {
            serveQueue({ fullRuns: [buildFullRun()], canManageFullRuns: true });
            server.use(
                http.post("/api/recalc/full-runs/:variant/stop", () =>
                    HttpResponse.json(
                        { message: "No full run of this variant is running" },
                        { status: 409 },
                    ),
                ),
            );

            renderTab(adminMe);

            await userEvent.click(await screen.findByRole("button", { name: "Stop" }));

            expect(await screen.findByText("No full run of this variant is running")).toBeVisible();
        });
    });

    describe("the add bar", () => {
        it("tells visitors to log in", async () => {
            serveQueue();

            renderTab(null);

            const link = await screen.findByRole("link", { name: "Log in to queue players" });

            expect(link).toHaveAttribute("href", "/login");
            expect(
                screen.queryByRole("textbox", { name: "Player name or ID" }),
            ).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Add to queue" })).not.toBeInTheDocument();
        });

        it("shows how many more players the person can queue", async () => {
            serveQueue({ allowance: { ...allowance, active: 1 } });

            renderTab(plainMe);

            expect(await screen.findByText("You can queue 2 more players")).toBeVisible();
        });

        it("shows the cooldown", async () => {
            serveQueue({ allowance: { ...allowance, cooldownRemainingSeconds: 90 } });

            renderTab(plainMe);

            expect(await screen.findByText(/next add in 1:30/)).toBeVisible();
        });

        it("queues a player by name, reloads and counts one slot fewer", async () => {
            const fake = serveQueue({ allowance });
            const bodies: unknown[] = [];

            server.use(
                http.post("/api/recalc/queue", async ({ request }) => {
                    const body = (await request.json()) as { variant: string; username: string };
                    const entry = buildQueueEntry({ id: "new", username: body.username });

                    bodies.push(body);
                    fake.view = {
                        ...fake.view,
                        queue: [entry],
                        allowance: { ...allowance, active: 1 },
                    };

                    return HttpResponse.json(entry, { status: 201 });
                }),
            );

            renderTab(plainMe);

            expect(await screen.findByText("You can queue 3 more players")).toBeVisible();

            await userEvent.type(
                screen.getByRole("textbox", { name: "Player name or ID" }),
                " Beta ",
            );
            await userEvent.click(screen.getByRole("button", { name: "Add to queue" }));

            expect(await screen.findByText("You can queue 2 more players")).toBeVisible();
            expect(bodies).toEqual([{ variant: "droid-rebalance", username: "Beta" }]);
            expect(within(getQueueSection()).getByText("Beta")).toBeVisible();
            expect(screen.getByText("Added Beta to the queue.")).toBeVisible();
            expect(screen.getByRole("textbox", { name: "Player name or ID" })).toHaveValue("");
        });

        it("sends digits as a uid", async () => {
            serveQueue({ allowance });
            const bodies: unknown[] = [];

            server.use(
                http.post("/api/recalc/queue", async ({ request }) => {
                    bodies.push(await request.json());

                    return HttpResponse.json(buildQueueEntry(), { status: 201 });
                }),
            );

            renderTab(plainMe);

            await userEvent.type(
                await screen.findByRole("textbox", { name: "Player name or ID" }),
                "1234",
            );
            await userEvent.click(screen.getByRole("button", { name: "Add to queue" }));

            await waitFor(() => {
                expect(bodies).toEqual([{ variant: "droid-rebalance", uid: 1234 }]);
            });
        });

        it("queues on Enter", async () => {
            serveQueue({ allowance });
            const bodies: unknown[] = [];

            server.use(
                http.post("/api/recalc/queue", async ({ request }) => {
                    bodies.push(await request.json());

                    return HttpResponse.json(buildQueueEntry(), { status: 201 });
                }),
            );

            renderTab(plainMe);

            await userEvent.type(
                await screen.findByRole("textbox", { name: "Player name or ID" }),
                "Beta{Enter}",
            );

            await waitFor(() => {
                expect(bodies).toHaveLength(1);
            });
        });

        it("does not add an empty name", async () => {
            serveQueue({ allowance });

            renderTab(plainMe);

            await screen.findByText("You can queue 3 more players");

            expect(screen.getByRole("button", { name: "Add to queue" })).toBeDisabled();
        });

        it("shows the server's reason when the player cannot be added", async () => {
            serveQueue({ allowance });
            server.use(
                http.post("/api/recalc/queue", () =>
                    HttpResponse.json(
                        { message: "Wait 12 seconds before adding another player" },
                        { status: 429, headers: { "Retry-After": "12" } },
                    ),
                ),
            );

            renderTab(plainMe);

            await userEvent.type(
                await screen.findByRole("textbox", { name: "Player name or ID" }),
                "Beta",
            );
            await userEvent.click(screen.getByRole("button", { name: "Add to queue" }));

            expect(
                await screen.findByText("Wait 12 seconds before adding another player"),
            ).toBeVisible();
            expect(screen.getByRole("textbox", { name: "Player name or ID" })).toHaveValue("Beta");
        });
    });

    describe("removing entries", () => {
        it("offers Remove on the person's own waiting entries only", async () => {
            serveQueue({
                queue: [mrekk, cryshina, akolibed],
                allowance,
            });

            renderTab(plainMe);

            await screen.findByText("cryshina");

            const own = within(screen.getByRole("row", { name: /cryshina/ }));
            const others = within(screen.getByRole("row", { name: /Akolibed/ }));
            const running = within(screen.getByRole("row", { name: /mrekk/ }));

            expect(own.getByRole("button", { name: "Remove cryshina" })).toBeVisible();
            expect(others.queryByRole("button")).not.toBeInTheDocument();
            expect(running.queryByRole("button")).not.toBeInTheDocument();
        });

        it("offers Remove on every waiting entry to people who can manage", async () => {
            serveQueue({ queue: [mrekk, cryshina, akolibed], canManageFullRuns: true });

            renderTab(adminMe);

            expect(await screen.findByRole("button", { name: "Remove Akolibed" })).toBeVisible();
            expect(screen.getByRole("button", { name: "Remove cryshina" })).toBeVisible();
            expect(screen.queryByRole("button", { name: "Remove mrekk" })).not.toBeInTheDocument();
        });

        it("offers nothing to visitors", async () => {
            serveQueue({ queue: [cryshina] });

            renderTab(null);

            await screen.findByText("cryshina");

            expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
        });

        it("removes the entry and reloads", async () => {
            const fake = serveQueue({ queue: [cryshina], allowance: { ...allowance, active: 1 } });
            const removed: string[] = [];

            server.use(
                http.delete("/api/recalc/queue/:id", ({ params }) => {
                    removed.push(String(params.id));
                    fake.view = { ...fake.view, queue: [], allowance };

                    return new HttpResponse(null, { status: 204 });
                }),
            );

            renderTab(plainMe);

            await userEvent.click(await screen.findByRole("button", { name: "Remove cryshina" }));

            await waitFor(() => {
                expect(screen.queryByText("cryshina")).not.toBeInTheDocument();
            });
            expect(removed).toEqual(["e2"]);
            expect(await screen.findByText("You can queue 3 more players")).toBeVisible();
        });

        it("shows why an entry could not be removed", async () => {
            serveQueue({ queue: [cryshina] });
            server.use(
                http.delete("/api/recalc/queue/:id", () =>
                    HttpResponse.json(
                        { message: "Only waiting entries can be removed" },
                        { status: 409 },
                    ),
                ),
            );

            renderTab(plainMe);

            await userEvent.click(await screen.findByRole("button", { name: "Remove cryshina" }));

            expect(await screen.findByText("Only waiting entries can be removed")).toBeVisible();
        });
    });

    describe("on a phone", () => {
        beforeEach(() => {
            vi.mocked(useBreakpoint).mockReturnValue("phone");
        });

        it("switches between the queue and recently finished", async () => {
            serveQueue({ queue: [mrekk, cryshina], recent: [milosz] });

            renderTab();

            const queueOption = await screen.findByRole("radio", { name: "Queue (2)" });

            expect(queueOption).toBeChecked();
            expect(screen.getByText("cryshina")).toBeVisible();
            expect(screen.queryByText("milosz")).not.toBeInTheDocument();

            await userEvent.click(screen.getByRole("radio", { name: "Recently finished" }));

            expect(screen.getByText("milosz")).toBeVisible();
            expect(screen.queryByText("cryshina")).not.toBeInTheDocument();
        });

        it("stacks each entry as a row with who queued it", async () => {
            serveQueue({ queue: [cryshina] });

            renderTab();

            const row = within(await screen.findByRole("listitem"));

            expect(row.getByText("cryshina")).toBeVisible();
            expect(row.getByText("Waiting")).toBeVisible();
            expect(row.getByText(/by player/)).toBeVisible();
            expect(screen.queryByRole("table")).not.toBeInTheDocument();
        });

        it("keeps Show all variants with the queue", async () => {
            serveQueue({ queue: [cryshina] });

            renderTab();

            await screen.findByText("cryshina");

            expect(screen.getByRole("checkbox", { name: "Show all variants" })).toBeVisible();

            await userEvent.click(screen.getByRole("radio", { name: "Recently finished" }));

            expect(
                screen.queryByRole("checkbox", { name: "Show all variants" }),
            ).not.toBeInTheDocument();
        });
    });

    describe("on a tablet or desktop", () => {
        it("shows both sections and no switch", async () => {
            serveQueue({ queue: [cryshina], recent: [milosz] });

            renderTab();

            await screen.findByText("cryshina");

            expect(getRecentSection()).toBeVisible();
            expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
        });
    });

    describe("polling", () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it("asks for the queue again every three seconds", async () => {
            const fake = serveQueue();

            vi.useFakeTimers({ shouldAdvanceTime: true });
            renderTab();

            await screen.findByText("The queue is empty.");

            const before = fake.requests.length;

            fake.view = { ...fake.view, queue: [mrekk] };
            await vi.advanceTimersByTimeAsync(3100);

            expect(await screen.findByText("mrekk")).toBeVisible();
            expect(fake.requests.length).toBeGreaterThan(before);
        });
    });
});
