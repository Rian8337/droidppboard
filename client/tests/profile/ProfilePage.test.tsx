import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IPrototypePP, PrototypeLeaderboardResponse } from "app-structures";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { ProfilePage } from "../../src/profile/ProfilePage";
import {
    alphaProfile,
    droidRebalance,
    plainMe,
    profileScores,
    readingVariant,
} from "../mocks/fixtures";
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

function answerWithMaster(variant = readingVariant) {
    server.use(
        http.get("/api/ppboard/prototype/getuserprofile", () => {
            const body: PrototypeLeaderboardResponse<IPrototypePP> = {
                variants: [droidRebalance, readingVariant],
                currentVariant: variant,
                data: { ...alphaProfile, masterPPTotal: 200 },
            };

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

    it("shows the avatar and name, and no country", async () => {
        renderProfile("/v/droid-rebalance/players/1000");

        expect(await screen.findByRole("heading", { name: "Alpha" })).toBeVisible();
        expect(screen.getByRole("img", { name: "Alpha" })).toHaveAttribute(
            "src",
            "https://osudroid.moe/user/avatar?id=1000",
        );
        expect(screen.queryByText(/country/i)).not.toBeInTheDocument();
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
        answerWithMaster(droidRebalance);

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

    it("shows Variant not found for an unknown variant", async () => {
        renderProfile("/v/nothing/players/1000");

        expect(await screen.findByText("Variant not found")).toBeVisible();
    });

    it("links Back to the leaderboard of the variant", async () => {
        renderProfile("/v/reading/players/1000");

        expect(await screen.findByRole("link", { name: /back/i })).toHaveAttribute(
            "href",
            "/v/reading/leaderboard",
        );
    });

    it("offers a disabled Add to queue to somebody logged in only", async () => {
        renderProfile("/v/droid-rebalance/players/1000", plainMe);

        expect(await screen.findByRole("button", { name: /add to queue/i })).toBeDisabled();
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
                HttpResponse.json({
                    variants: [droidRebalance],
                    currentVariant: droidRebalance,
                    data: { ...alphaProfile, pp: [], localPPTotal: 0, livePPTotal: 0 },
                }),
            ),
        );

        renderProfile("/v/droid-rebalance/players/1000");

        expect(await screen.findByText("No scores found.")).toBeVisible();
    });
});
