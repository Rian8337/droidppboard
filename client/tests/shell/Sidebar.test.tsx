import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Sidebar } from "../../src/shell/Sidebar";
import { droidRebalance, flowaim, buildVariant, readingVariant } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

function respondWithVariants(...variants: ReturnType<typeof buildVariant>[]) {
    server.use(http.get("/api/ppboard/variants", () => HttpResponse.json(variants)));
}

describe("Sidebar", () => {
    it("shows the version and a link to the issue tracker", () => {
        renderWithProviders(<Sidebar onNavigate={() => {}} />);

        expect(screen.getByText(`Version ${__APP_VERSION__}`, { exact: false })).toBeVisible();
        expect(screen.getByRole("link", { name: "Issue tracker" })).toHaveAttribute(
            "href",
            "https://github.com/Rian8337/droidppboard/issues",
        );
    });

    it("lists droid-rebalance first, then the newest", async () => {
        respondWithVariants(flowaim, readingVariant, droidRebalance);
        renderWithProviders(<Sidebar onNavigate={() => {}} />);

        const links = await screen.findAllByRole("link", { name: /Last updated/ });

        expect(links.map((link) => link.getAttribute("href"))).toEqual([
            "/v/droid-rebalance/leaderboard",
            "/v/reading/leaderboard",
            "/v/flowaim/leaderboard",
        ]);
    });

    it("shows the title, or the name when there is none, with the name and age below", async () => {
        respondWithVariants(
            droidRebalance,
            buildVariant({ name: "untitled", title: null, builtAt: null }),
        );
        renderWithProviders(<Sidebar onNavigate={() => {}} />);

        const rebalance = await screen.findByRole("link", { name: /Rebalance/ });

        expect(rebalance).toHaveTextContent(
            /droid-rebalance\s*Last updated: .+ ago \(2026-10-11 13:16 UTC\)/,
        );

        const untitled = screen.getByRole("link", { name: /untitled/ });

        expect(untitled).toHaveTextContent("untitled");
        expect(untitled).not.toHaveTextContent("Last updated");
    });

    it("marks the current variant", async () => {
        renderWithProviders(<Sidebar onNavigate={() => {}} />, {
            route: "/v/reading/top-plays",
        });

        expect(await screen.findByRole("link", { name: /Reading/ })).toHaveAttribute(
            "aria-current",
            "true",
        );
        expect(screen.getByRole("link", { name: /Rebalance/ })).not.toHaveAttribute("aria-current");
    });

    it("marks the current variant when the address names it by an alias", async () => {
        renderWithProviders(<Sidebar onNavigate={() => {}} />, {
            route: "/v/rebalance/leaderboard",
        });

        expect(await screen.findByRole("link", { name: /Rebalance/ })).toHaveAttribute(
            "aria-current",
            "true",
        );
    });

    it("filters the variants by title or name, ignoring case", async () => {
        respondWithVariants(droidRebalance, flowaim, readingVariant);
        renderWithProviders(<Sidebar onNavigate={() => {}} />);
        await screen.findByRole("link", { name: /Flow aim/ });

        const search = screen.getByRole("searchbox", { name: "Search reworks" });

        await userEvent.type(search, "FLOW");

        expect(screen.getByRole("link", { name: /Flow aim/ })).toBeVisible();
        expect(screen.queryByRole("link", { name: /Reading/ })).not.toBeInTheDocument();

        await userEvent.clear(search);
        await userEvent.type(search, "droid-reb");

        expect(screen.getByRole("link", { name: /Rebalance/ })).toBeVisible();
        expect(screen.queryByRole("link", { name: /Flow aim/ })).not.toBeInTheDocument();
    });

    it("says when no variant matches", async () => {
        renderWithProviders(<Sidebar onNavigate={() => {}} />);
        await screen.findByRole("link", { name: /Rebalance/ });

        await userEvent.type(screen.getByRole("searchbox"), "zzz");

        expect(screen.getByText("No reworks match.")).toBeVisible();
    });

    it("shows a globe with a tooltip on tap for private variants only", async () => {
        respondWithVariants(droidRebalance, flowaim);
        renderWithProviders(<Sidebar onNavigate={() => {}} />);
        await screen.findByRole("link", { name: /Flow aim/ });

        const globes = screen.getAllByLabelText("Private rework");

        expect(globes).toHaveLength(1);

        await userEvent.click(globes[0]);

        expect(screen.getByRole("tooltip")).toHaveTextContent("Private rework");
    });

    it("pins droid-rebalance", async () => {
        renderWithProviders(<Sidebar onNavigate={() => {}} />);

        const rebalance = await screen.findByRole("link", { name: /Rebalance/ });

        expect(within(rebalance).getByLabelText("Pinned")).toBeInTheDocument();
        expect(
            within(screen.getByRole("link", { name: /Reading/ })).queryByLabelText("Pinned"),
        ).not.toBeInTheDocument();
    });

    it("pins variants an admin pinned", async () => {
        respondWithVariants(droidRebalance, { ...readingVariant, pinned: true });
        renderWithProviders(<Sidebar onNavigate={() => {}} />);

        const reading = await screen.findByRole("link", { name: /Reading/ });

        expect(within(reading).getByLabelText("Pinned")).toBeInTheDocument();
    });

    it("links to the tools, donating, and credits the project", () => {
        renderWithProviders(<Sidebar onNavigate={() => {}} />);

        expect(screen.getByRole("link", { name: "Beatmap calculator" })).toHaveAttribute(
            "href",
            "/calculate",
        );
        expect(screen.getByRole("link", { name: "Whitelist" })).toHaveAttribute(
            "href",
            "/whitelist",
        );
        expect(screen.getByRole("link", { name: "Score multiplier sample" })).toHaveAttribute(
            "href",
            "/score-multiplier",
        );
        expect(screen.getByRole("link", { name: /Donate <3/ })).toHaveAttribute("href", "/about");
        expect(
            screen.getByText(`osu!droid PP Project Site · © ${new Date().getFullYear()} Rian8337`),
        ).toBeVisible();
    });

    it("tells its owner when something was picked", async () => {
        const onNavigate = vi.fn();
        renderWithProviders(<Sidebar onNavigate={onNavigate} />);

        await userEvent.click(await screen.findByRole("link", { name: /Reading/ }));
        await userEvent.click(screen.getByRole("link", { name: "Whitelist" }));

        expect(onNavigate).toHaveBeenCalledTimes(2);
    });
});
