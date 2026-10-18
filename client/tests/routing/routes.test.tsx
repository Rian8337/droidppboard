import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { AppRoutes } from "../../src/routing/routes";
import { droidCalculation } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

function serveSnapshot() {
    server.use(
        http.get("/api/ppboard/snapshots/:id", () =>
            HttpResponse.json({
                id: "abc1234567",
                createdAt: "2026-10-12T08:00:00.000Z",
                expiresAt: "2026-11-11T08:00:00.000Z",
                calculation: droidCalculation,
            }),
        ),
    );
}

describe("AppRoutes", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    it("opens the droid-rebalance leaderboard at the root", async () => {
        renderWithProviders(<AppRoutes />, { route: "/" });

        expect(await screen.findByRole("heading", { name: "PP Board · Rebalance" })).toBeVisible();
        expect(await screen.findByText("Alpha")).toBeVisible();
    });

    it("shows a variant tab inside the shell", async () => {
        renderWithProviders(<AppRoutes />, { route: "/v/reading/queue" });

        expect(await screen.findByRole("heading", { name: "PP Board · Reading" })).toBeVisible();
        expect(await screen.findByText("This tab is not available yet.")).toBeVisible();
        expect(screen.getByRole("link", { name: "Queue" })).toHaveAttribute("aria-current", "page");
    });

    it("opens a player's profile inside the shell", async () => {
        renderWithProviders(<AppRoutes />, { route: "/v/reading/players/1000" });

        expect(await screen.findByRole("heading", { name: "Alpha" })).toBeVisible();
        expect(screen.getByRole("heading", { name: "PP Board · Reading" })).toBeVisible();
    });

    it("redirects an old address to its new one", async () => {
        renderWithProviders(<AppRoutes />, { route: "/prototype/top-plays/reading?x=1" });

        expect(await screen.findByRole("heading", { name: "PP Board · Reading" })).toBeVisible();
        expect(await screen.findByText("Bravo Tune")).toBeVisible();
        expect(screen.getByRole("link", { name: "Top plays" })).toHaveAttribute(
            "aria-current",
            "page",
        );
    });

    it("says when a page does not exist", () => {
        renderWithProviders(<AppRoutes />, { route: "/nothing/here" });

        expect(screen.getByText("Page not found")).toBeVisible();
        expect(screen.getByRole("complementary")).toBeVisible();
    });

    it("opens a variant's snapshot rather than a tab", async () => {
        serveSnapshot();
        renderWithProviders(<AppRoutes />, { route: "/v/droid-rebalance/calculator/s/abc1234567" });

        expect(await screen.findByText(/^Snapshot taken /)).toBeVisible();
    });

    it("opens the Beatmap calculator and its snapshots", async () => {
        renderWithProviders(<AppRoutes />, { route: "/calculate" });

        expect(await screen.findByLabelText("Variant")).toHaveValue("droid-live");
    });

    it("opens a Beatmap calculator snapshot", async () => {
        serveSnapshot();
        renderWithProviders(<AppRoutes />, { route: "/calculate/s/abc1234567" });

        expect(await screen.findByText(/^Snapshot taken /)).toBeVisible();
    });
});
