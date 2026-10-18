import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { AppRoutes } from "../../src/routing/routes";
import { droidRebalance, flowaim, leaderboardPlayers } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { mockSession, watchFor } from "../utils/mockSession";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

// Review focus 4: logging out on a private variant's page drops its data and shows not found.
describe("logging out on a private variant's page", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    it("shows not found and never a leaderboard row of the variant after the logout", async () => {
        const session = mockSession();

        server.use(
            http.get("/api/ppboard/prototype/getleaderboard", async () => {
                // The session changes once the logout has been answered.
                const isLoggedIn = session.getChangedAt() === null;

                await delay(isLoggedIn ? 0 : 150);

                return isLoggedIn
                    ? HttpResponse.json({
                          variants: [droidRebalance, flowaim],
                          currentVariant: flowaim,
                          data: leaderboardPlayers,
                      })
                    : HttpResponse.json({ message: "Rework not found" }, { status: 404 });
            }),
        );

        renderWithProviders(<AppRoutes />, { route: "/v/flowaim/leaderboard", me: undefined });

        expect(await screen.findByText("Alpha")).toBeVisible();

        const finishWatching = watchFor("Alpha", session);

        await userEvent.click(await screen.findByRole("button", { name: /manager/ }));
        await userEvent.click(screen.getByRole("menuitem", { name: "Log out" }));

        expect(await finishWatching()).toBe(0);
        expect(await screen.findByText("Rework not found")).toBeVisible();
    });
});
