import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { VariantPage } from "../../src/variant/VariantPage";
import { droidRebalance, flowaim, managerMe, readingVariant } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders, type RenderWithProvidersOptions } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

function renderPage(route: string, options: RenderWithProvidersOptions = {}) {
    server.use(
        http.get("/api/ppboard/variants", () =>
            HttpResponse.json([droidRebalance, readingVariant, flowaim]),
        ),
    );

    return renderWithProviders(
        <Routes>
            <Route path="v/:variant/:tab" element={<VariantPage />} />
        </Routes>,
        { route, ...options },
    );
}

function getTabLabels(): string[] {
    return within(screen.getByRole("navigation"))
        .getAllByRole("link")
        .map((link) => link.textContent);
}

describe("VariantPage", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    it("says when the variant is not found", async () => {
        renderPage("/v/nothing/info");

        expect(await screen.findByText("Variant not found")).toBeVisible();
    });

    it("does not show a private variant to someone who cannot see it", async () => {
        server.use(http.get("/api/ppboard/variants", () => HttpResponse.json([droidRebalance])));
        renderWithProviders(
            <Routes>
                <Route path="v/:variant/:tab" element={<VariantPage />} />
            </Routes>,
            { route: "/v/flowaim/info" },
        );

        expect(await screen.findByText("Variant not found")).toBeVisible();
        expect(screen.queryByText("An experiment with flow aim.")).not.toBeInTheDocument();
    });

    it("finds a variant by its alias", async () => {
        renderPage("/v/rebalance/info");

        expect(await screen.findByText("droid-rebalance")).toBeVisible();
    });

    it("says when the tab is not found", async () => {
        renderPage("/v/droid-rebalance/nothing");

        expect(await screen.findByText("Page not found")).toBeVisible();
    });

    it("shows the description above the tabs and the Info tab's content", async () => {
        renderPage("/v/droid-rebalance/info");

        expect(
            await screen.findByText("The rebalanced osu!droid performance point system."),
        ).toBeVisible();
        expect(screen.getByRole("link", { name: "Info" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByText("Internal name")).toBeVisible();
    });

    it("shows an empty state for a tab nothing has registered for", async () => {
        renderPage("/v/droid-rebalance/queue");

        expect(await screen.findByText("This tab is not available yet.")).toBeVisible();
    });

    it("orders the tabs Info first on a desktop", async () => {
        renderPage("/v/droid-rebalance/info");
        await screen.findByRole("navigation");

        expect(getTabLabels()).toEqual(["Info", "Leaderboard", "Top plays", "Queue", "Calculator"]);
    });

    it("orders the tabs Leaderboard first and Info last on a phone", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("phone");
        renderPage("/v/droid-rebalance/info");
        await screen.findByRole("navigation");

        expect(getTabLabels()).toEqual(["Leaderboard", "Top plays", "Queue", "Calculator", "Info"]);
    });

    it("shows the Admin tab to a manager on a variant they are granted", async () => {
        renderPage("/v/flowaim/info", { me: managerMe });

        expect(await screen.findByRole("link", { name: "Admin" })).toBeVisible();
    });

    it("hides the Admin tab from a manager on any other variant", async () => {
        renderPage("/v/droid-rebalance/info", { me: managerMe });
        await screen.findByRole("navigation");

        expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
    });

    it("does not open the Admin tab of someone who cannot manage the variant", async () => {
        renderPage("/v/droid-rebalance/admin", { me: managerMe });

        expect(await screen.findByText("Page not found")).toBeVisible();
    });
});
