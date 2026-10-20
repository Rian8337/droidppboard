import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PrototypePlayer } from "app-structures";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { ProfilePage } from "../../src/profile/ProfilePage";
import { alphaProfile, buildQueueEntry, plainMe, profileScores } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders, type RenderWithProvidersOptions } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

function renderProfile(route: string, me?: RenderWithProvidersOptions["me"]) {
    return renderWithProviders(
        <Routes>
            <Route path="/v/:variant/players/:uid" element={<ProfilePage />} />
        </Routes>,
        { route, me },
    );
}

function answerWithMaster() {
    server.use(
        http.get("/api/ppboard/prototype/getuserprofile", () => {
            const body: PrototypePlayer = { ...alphaProfile, masterPPTotal: 200 };

            return HttpResponse.json(body);
        }),
    );
}

function getStatNames(): string[] {
    return screen.getAllByRole("term").map((term) => term.textContent ?? "");
}

/** The block of the header that shows the stat of this name. */
function getStat(name: string): HTMLElement {
    const term = screen.getAllByRole("term").find((candidate) => candidate.textContent === name);

    return term!.closest("div")!;
}

describe("ProfilePage", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
        localStorage.clear();
    });

    it("shows the avatar and name", async () => {
        renderProfile("/v/droid-rebalance/players/1000");

        expect(await screen.findByRole("heading", { name: "Alpha" })).toBeVisible();
        expect(screen.getByRole("img", { name: "Alpha" })).toHaveAttribute(
            "src",
            "https://osudroid.moe/user/avatar?id=1000",
        );
    });

    it("shows the flag of the player's country beside the name", async () => {
        renderProfile("/v/droid-rebalance/players/1000");

        const heading = await screen.findByRole("heading", { name: "Alpha" });
        const flag = screen.getByRole("img", { name: "Indonesia" });

        expect(flag).toBeVisible();
        expect(flag.parentElement).toBe(heading.parentElement);
    });

    it("shows no flag when the player's country is unknown", async () => {
        server.use(
            http.get("/api/ppboard/prototype/getuserprofile", () =>
                HttpResponse.json({ ...alphaProfile, country: null }),
            ),
        );

        renderProfile("/v/droid-rebalance/players/1000");

        await screen.findByRole("heading", { name: "Alpha" });

        expect(screen.getAllByRole("img").map((image) => image.getAttribute("alt"))).toEqual([
            "Alpha",
        ]);
    });

    it("titles the browser tab after the player and the variant", async () => {
        renderProfile("/v/droid-rebalance/players/1000");

        await screen.findByRole("heading", { name: "Alpha" });

        await waitFor(() => expect(document.title).toBe("Alpha · Rebalance · PP Board"));
    });

    it("puts Local pp, Live pp and Difference first, then the skills", async () => {
        renderProfile("/v/droid-rebalance/players/1000");

        await screen.findByRole("heading", { name: "Alpha" });

        expect(getStatNames()).toEqual([
            "Local pp",
            "Live pp",
            "Difference",
            "Aim pp",
            "Tap pp",
            "Accuracy pp",
            "Flashlight pp",
            "Reading pp",
            "Hit accuracy",
        ]);
    });

    it("shows the totals and the difference against live", async () => {
        renderProfile("/v/droid-rebalance/players/1000");

        await screen.findByRole("heading", { name: "Alpha" });

        const local = getStat("Local pp");
        const live = getStat("Live pp");
        const difference = getStat("Difference");

        expect(within(local).getByText("215.50")).toBeVisible();
        expect(within(live).getByText("190.00")).toBeVisible();
        expect(within(difference).getByText("+25.5")).toHaveAttribute("data-tone", "up");
    });

    it("weighs each skill and the hit accuracy by 0.95 to the power of the score's rank", async () => {
        renderProfile("/v/droid-rebalance/players/1000");

        await screen.findByRole("heading", { name: "Alpha" });

        // Local totals are 130 and 90, so aim (40% of the total) is 52 + 36 * 0.95.
        const aim = getStat("Aim pp");
        expect(within(aim).getByText("86.20")).toBeVisible();

        // Accuracies 98.5 and 90, weighted 1 and 0.95, then divided by the weights.
        const accuracy = getStat("Hit accuracy");
        expect(within(accuracy).getByText("94.36%")).toBeVisible();
    });

    it("hides Master pp on droid-rebalance even if the server sent it", async () => {
        answerWithMaster();

        renderProfile("/v/droid-rebalance/players/1000");

        await screen.findByRole("heading", { name: "Alpha" });

        expect(getStatNames()).not.toContain("Master pp");
    });

    it("shows Master pp elsewhere and compares against it", async () => {
        answerWithMaster();

        renderProfile("/v/reading/players/1000");

        await screen.findByRole("heading", { name: "Alpha" });

        expect(getStatNames()).toContain("Master pp");
        expect(screen.getByText("+15.5")).toHaveAttribute("data-tone", "up");
    });

    it("shows Player not found for an unknown player", async () => {
        renderProfile("/v/droid-rebalance/players/9");

        expect(await screen.findByText("Player not found")).toBeVisible();
    });

    it("shows Rework not found for an unknown variant", async () => {
        renderProfile("/v/nothing/players/1000");

        expect(await screen.findByText("Rework not found")).toBeVisible();
    });

    it("links Back to the leaderboard of the variant", async () => {
        renderProfile("/v/reading/players/1000");

        expect(await screen.findByRole("link", { name: /back/i })).toHaveAttribute(
            "href",
            "/v/reading/leaderboard",
        );
    });

    it("queues the player for the variant and says so", async () => {
        const bodies: unknown[] = [];

        server.use(
            http.post("/api/recalc/queue", async ({ request }) => {
                bodies.push(await request.json());

                return HttpResponse.json(buildQueueEntry(), { status: 201 });
            }),
        );

        renderProfile("/v/reading/players/1000", plainMe);

        await userEvent.click(await screen.findByRole("button", { name: /add to queue/i }));

        expect(await screen.findByText("Added Alpha to the queue.")).toBeVisible();
        expect(bodies).toEqual([{ variant: "reading", uid: 1000 }]);
    });

    it("shows why the player could not be queued", async () => {
        server.use(
            http.post("/api/recalc/queue", () =>
                HttpResponse.json(
                    { message: "This player is already queued for this rework" },
                    { status: 409 },
                ),
            ),
        );

        renderProfile("/v/droid-rebalance/players/1000", plainMe);

        await userEvent.click(await screen.findByRole("button", { name: /add to queue/i }));

        expect(
            await screen.findByText("This player is already queued for this rework"),
        ).toBeVisible();
        expect(screen.queryByText("Added Alpha to the queue.")).not.toBeInTheDocument();
    });

    it("warns that the data is outdated when the player was calculated before the variant was built", async () => {
        server.use(
            http.get("/api/ppboard/prototype/getuserprofile", () =>
                HttpResponse.json({
                    ...alphaProfile,
                    lastUpdate: Date.parse("2026-10-11T13:15:00.000Z"),
                }),
            ),
        );

        renderProfile("/v/droid-rebalance/players/1000", plainMe);

        const note = await screen.findByRole("note");

        expect(note).toHaveTextContent("Outdated data");
        expect(note).toHaveTextContent("Add them to the queue to recalculate.");
    });

    it("asks a visitor to log in to recalculate an outdated player", async () => {
        server.use(
            http.get("/api/ppboard/prototype/getuserprofile", () =>
                HttpResponse.json({ ...alphaProfile, lastUpdate: 0 }),
            ),
        );

        renderProfile("/v/droid-rebalance/players/1000", null);

        expect(await screen.findByRole("note")).toHaveTextContent(
            "Log in to add them to the queue.",
        );
    });

    it("shows no outdated warning for a player calculated after the variant was built", async () => {
        renderProfile("/v/droid-rebalance/players/1000");

        await screen.findByRole("heading", { name: "Alpha" });

        expect(screen.queryByRole("note")).not.toBeInTheDocument();
    });

    it("has no Add to queue for a visitor", async () => {
        renderProfile("/v/droid-rebalance/players/1000", null);

        await screen.findByRole("heading", { name: "Alpha" });

        expect(screen.queryByRole("button", { name: /add to queue/i })).not.toBeInTheDocument();
    });

    it("lists the scores in a table that remembers its columns as profile-columns", async () => {
        renderProfile("/v/droid-rebalance/players/1000");

        for (const score of profileScores) {
            expect(await screen.findByText(score.title)).toBeVisible();
        }

        expect(screen.queryByRole("columnheader", { name: "Player" })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Columns" }));
        await userEvent.click(screen.getByRole("checkbox", { name: "Miss" }));

        expect(localStorage.getItem("profile-columns")).not.toBeNull();
    });

    it("says when the player has no scores", async () => {
        server.use(
            http.get("/api/ppboard/prototype/getuserprofile", () =>
                HttpResponse.json({ ...alphaProfile, pp: [], localPPTotal: 0, livePPTotal: 0 }),
            ),
        );

        renderProfile("/v/droid-rebalance/players/1000");

        expect(await screen.findByText("No scores found.")).toBeVisible();
    });
});
