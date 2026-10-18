import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { AppRoutes } from "../../src/routing/routes";
import { droidCalculation, droidRebalance, flowaim, managerMe } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { serveManage } from "../admin/serveManage";
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

    it("opens the leaderboard of a variant whose address names no tab", async () => {
        renderWithProviders(<AppRoutes />, { route: "/v/reading" });

        expect(await screen.findByRole("heading", { name: "PP Board · Reading" })).toBeVisible();
        expect(await screen.findByText("Alpha")).toBeVisible();
        expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute(
            "aria-current",
            "page",
        );
    });

    it("shows a variant tab inside the shell", async () => {
        renderWithProviders(<AppRoutes />, { route: "/v/reading/queue" });

        expect(await screen.findByRole("heading", { name: "PP Board · Reading" })).toBeVisible();
        expect(await screen.findByRole("region", { name: "Queue" })).toBeVisible();
        expect(screen.getByRole("link", { name: "Queue" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("navigation", { name: "Variant pages" })).toBeVisible();
    });

    it("opens a player's profile inside the shell", async () => {
        renderWithProviders(<AppRoutes />, { route: "/v/reading/players/1000" });

        expect(await screen.findByRole("heading", { name: "Alpha" })).toBeVisible();
        expect(screen.getByRole("heading", { name: "PP Board · Reading" })).toBeVisible();
    });

    it("titles the browser tab after the variant tab and after the player", async () => {
        const tab = renderWithProviders(<AppRoutes />, { route: "/v/reading/queue" });

        await screen.findByRole("heading", { name: "PP Board · Reading" });
        await waitFor(() => expect(document.title).toBe("Reading · PP Board"));
        tab.unmount();

        renderWithProviders(<AppRoutes />, { route: "/v/reading/players/1000" });

        await screen.findByRole("heading", { name: "Alpha" });
        await waitFor(() => expect(document.title).toBe("Alpha · Reading · PP Board"));
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

    it.each([
        ["/whitelist", "Whitelisted beatmaps"],
        ["/score-multiplier", "Old multiplier"],
        ["/about", "Donor list"],
        ["/login", "Log in with your osu!droid account."],
    ])("opens %s inside the shell", async (route, text) => {
        server.use(http.get("/api/ppboard/getwhitelist", () => HttpResponse.json([])));
        renderWithProviders(<AppRoutes />, { route });

        expect(await screen.findByText(text)).toBeVisible();
        expect(screen.getByRole("complementary")).toBeVisible();
    });

    it("opens the skin list, a skin and a match history", async () => {
        server.use(
            http.get("/api/skins/search", () => HttpResponse.json([])),
            http.get("/api/skins/get", () => HttpResponse.json(null)),
            http.get("https://droidpp.osudroid.moe/api/tournament/getrooms_history", () =>
                HttpResponse.json({ name: "Room", sessions: [] }),
            ),
        );

        const skinList = renderWithProviders(<AppRoutes />, { route: "/skin/list" });

        expect(await screen.findByText("No skins found.")).toBeVisible();
        skinList.unmount();

        const skin = renderWithProviders(<AppRoutes />, { route: "/skin/1234/Cool" });

        expect(await screen.findByText("Skin not found")).toBeVisible();
        skin.unmount();

        renderWithProviders(<AppRoutes />, { route: "/match_history/5" });

        expect(await screen.findByRole("heading", { name: "Room" })).toBeVisible();
    });

    describe("an old /manage/variants link opened by a manager", () => {
        beforeEach(() => {
            serveManage({ grants: [managerMe.uid], usernames: { [managerMe.uid]: "manager" } });
            server.use(
                http.get("/api/ppboard/variants", () =>
                    HttpResponse.json([droidRebalance, flowaim]),
                ),
            );
        });

        it("lands on the Admin tab of a variant that the manager manages", async () => {
            renderWithProviders(<AppRoutes />, {
                route: "/manage/variants/flowaim",
                me: managerMe,
            });

            expect(
                await screen.findByRole("heading", { name: "PP Board · Flow aim" }),
            ).toBeVisible();
            expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
                "aria-current",
                "page",
            );
        });

        it("still says that the admin role is needed for any other variant", async () => {
            renderWithProviders(<AppRoutes />, {
                route: "/manage/variants/droid-rebalance",
                me: managerMe,
            });

            expect(
                await screen.findByText("You need the admin role to see this page"),
            ).toBeVisible();
        });
    });
});
