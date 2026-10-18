import { screen } from "@testing-library/react";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { AppRoutes } from "../../src/routing/routes";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

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

    it("redirects an old address to its new one", async () => {
        renderWithProviders(<AppRoutes />, { route: "/prototype/top-plays/reading?x=1" });

        expect(await screen.findByRole("heading", { name: "PP Board · Reading" })).toBeVisible();
        expect(await screen.findByText("This tab is not available yet.")).toBeVisible();
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
});
