import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PrototypePlayer } from "app-structures";
import { delay, http, HttpResponse } from "msw";
import { Route, Routes, useLocation } from "react-router";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import type { RenderWithProvidersOptions } from "../utils/renderWithProviders";
import { LeaderboardTab } from "../../src/leaderboard/LeaderboardTab";
import {
    buildPlayer,
    droidRebalance,
    leaderboardPlayers,
    plainMe,
    readingVariant,
} from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

function Location() {
    return <p data-testid="location">{useLocation().pathname}</p>;
}

function renderTab(variant = droidRebalance, me?: RenderWithProvidersOptions["me"]) {
    return renderWithProviders(
        <>
            <LeaderboardTab variant={variant} />
            <Routes>
                <Route path="*" element={<Location />} />
            </Routes>
        </>,
        { route: `/v/${variant.name}/leaderboard`, me },
    );
}

/** Answers the leaderboard with `rowsFor(page)` and records the URL of every request. */
function answerWith(rowsFor: (page: number) => PrototypePlayer[]): URL[] {
    const requests: URL[] = [];

    server.use(
        http.get("/api/ppboard/prototype/getleaderboard", ({ request }) => {
            const url = new URL(request.url);
            requests.push(url);

            const body: PrototypePlayer[] = rowsFor(Number(url.searchParams.get("page") ?? "1"));

            return HttpResponse.json(body);
        }),
    );

    return requests;
}

function buildPage(page: number, size: number): PrototypePlayer[] {
    return Array.from({ length: size }, (_, index) =>
        buildPlayer({ uid: page * 100 + index, username: `Player ${page}-${index}` }),
    );
}

describe("LeaderboardTab", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    it("renders the rows with signed, coloured differences", async () => {
        renderTab();

        const alpha = (await screen.findByText("Alpha")).closest("tr")!;
        const bravo = screen.getByText("Bravo").closest("tr")!;
        const charlie = screen.getByText("Charlie").closest("tr")!;

        expect(within(alpha).getByText("1500.00")).toBeVisible();
        expect(within(alpha).getByText("1520.50")).toBeVisible();
        expect(within(alpha).getByText("+20.5")).toHaveAttribute("data-tone", "up");
        expect(within(bravo).getByText("-10.3")).toHaveAttribute("data-tone", "down");
        expect(within(charlie).getByText("0.0")).toHaveAttribute("data-tone", "neutral");
    });

    it("shows the flag of each player's country in the Player cell, and none when it is unknown", async () => {
        renderTab();

        const alpha = (await screen.findByText("Alpha")).closest("tr")!;
        const bravo = screen.getByText("Bravo").closest("tr")!;
        const charlie = screen.getByText("Charlie").closest("tr")!;

        expect(within(alpha).getByRole("img", { name: "Indonesia" })).toBeVisible();
        expect(within(bravo).getByRole("img", { name: "Japan" })).toBeVisible();
        expect(within(charlie).queryByRole("img")).not.toBeInTheDocument();
    });

    it("shows the flag of each player's country on a phone", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("phone");

        renderTab();

        const alpha = (await screen.findByText("Alpha")).closest("li")!;
        const charlie = screen.getByText("Charlie").closest("li")!;

        expect(within(alpha).getByRole("img", { name: "Indonesia" })).toBeVisible();
        expect(within(charlie).queryByRole("img")).not.toBeInTheDocument();
    });

    it("marks the players calculated before the variant was built as outdated", async () => {
        answerWith(() => [
            buildPlayer({
                uid: 1,
                username: "Stale",
                lastUpdate: Date.parse("2026-10-11T13:15:00.000Z"),
            }),
            buildPlayer({ uid: 2, username: "Fresh" }),
        ]);

        renderTab();

        const stale = (await screen.findByText("Stale")).closest("tr")!;
        const fresh = screen.getByText("Fresh").closest("tr")!;

        expect(within(stale).getByText("Outdated")).toBeVisible();
        expect(within(fresh).queryByText("Outdated")).not.toBeInTheDocument();
    });

    it("marks outdated players on a phone", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("phone");
        answerWith(() => [buildPlayer({ uid: 1, username: "Stale", lastUpdate: 0 })]);

        renderTab();

        const stale = (await screen.findByText("Stale")).closest("li")!;

        expect(within(stale).getByText("Outdated")).toBeVisible();
    });

    it("marks nobody as outdated when the variant's build time is unknown", async () => {
        const variant = { ...droidRebalance, builtAt: null };
        answerWith(() => [buildPlayer({ uid: 1, username: "Stale", lastUpdate: 0 })]);

        renderTab(variant);

        await screen.findByText("Stale");

        expect(screen.queryByText("Outdated")).not.toBeInTheDocument();
    });

    it("shows the columns without any sort button", async () => {
        renderTab();

        await screen.findByText("Alpha");

        for (const name of ["Rank", "Player", "Live pp", "Local pp", "Difference"]) {
            expect(screen.getByRole("columnheader", { name })).toBeVisible();
        }

        expect(
            screen.queryByRole("columnheader", { name: /rank change/i }),
        ).not.toBeInTheDocument();
        expect(within(screen.getByRole("table")).queryAllByRole("button")).toHaveLength(0);
    });

    it("numbers the rows from 1 and continues at 51 on page 2", async () => {
        answerWith((page) => buildPage(page, page === 1 ? 50 : 2));
        const user = userEvent.setup();

        renderTab();

        const firstRow = (await screen.findByText("Player 1-0")).closest("tr")!;
        expect(within(firstRow).getAllByRole("cell")[0]).toHaveTextContent("1");

        await user.click(screen.getByRole("button", { name: "Next page" }));

        const pageTwoRow = (await screen.findByText("Player 2-0")).closest("tr")!;
        expect(within(pageTwoRow).getAllByRole("cell")[0]).toHaveTextContent("51");
        expect(screen.getByText("Page 2")).toBeVisible();
        expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    });

    it("shows Master pp only for a variant other than droid-rebalance", async () => {
        const withMaster = leaderboardPlayers.map((player) => ({
            ...player,
            masterPPTotal: 1234.5,
        }));
        answerWith(() => withMaster);

        const { unmount } = renderTab(readingVariant);

        expect(await screen.findByRole("columnheader", { name: "Master pp" })).toBeVisible();
        expect(screen.getAllByText("1234.50")).toHaveLength(3);

        unmount();
        answerWith(() => withMaster);
        renderTab(droidRebalance);

        await screen.findByText("Alpha");
        expect(screen.queryByRole("columnheader", { name: "Master pp" })).not.toBeInTheDocument();
    });

    it("leaves out Master pp when no row has it", async () => {
        renderTab(readingVariant);

        await screen.findByText("Alpha");

        expect(screen.queryByRole("columnheader", { name: "Master pp" })).not.toBeInTheDocument();
    });

    it("searches after typing stops, from page 1", async () => {
        const requests = answerWith(() => leaderboardPlayers);
        const user = userEvent.setup();

        renderTab();
        await screen.findByText("Alpha");

        await user.type(screen.getByRole("searchbox", { name: "Search player" }), "bra");

        await waitFor(() => expect(requests.at(-1)?.searchParams.get("query")).toBe("bra"));
        expect(requests.at(-1)?.searchParams.get("type")).toBe("droid-rebalance");
        expect(requests.at(-1)?.searchParams.get("page")).toBe("1");
        // Typing three letters must not have sent a request per letter.
        expect(requests.filter((url) => url.searchParams.has("query"))).toHaveLength(1);
    });

    it("renders stacked rows on a phone", async () => {
        vi.mocked(useBreakpoint).mockReturnValue("phone");

        renderTab();

        const alpha = (await screen.findByText("Alpha")).closest("a")!;

        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        expect(alpha).toHaveAttribute("href", "/v/droid-rebalance/players/1000");
        expect(within(alpha).getByText("1520.50")).toBeVisible();
        expect(within(alpha).getByText("1500.00")).toBeVisible();
        expect(within(alpha).getByText("+20.5")).toHaveAttribute("data-tone", "up");
    });

    it("opens the player's profile when a row is clicked", async () => {
        const user = userEvent.setup();

        renderTab();

        await user.click(await screen.findByText("Bravo"));

        expect(screen.getByTestId("location")).toHaveTextContent("/v/droid-rebalance/players/1001");
    });

    it("offers Open my profile only when logged in", async () => {
        const user = userEvent.setup();

        const { unmount } = renderTab(droidRebalance, null);
        await screen.findByText("Alpha");
        expect(screen.queryByRole("button", { name: "Open my profile" })).not.toBeInTheDocument();
        unmount();

        renderTab(droidRebalance, plainMe);
        await user.click(await screen.findByRole("button", { name: "Open my profile" }));

        expect(screen.getByTestId("location")).toHaveTextContent(
            `/v/droid-rebalance/players/${plainMe.uid}`,
        );
    });

    it("says so when the search finds nobody", async () => {
        answerWith(() => []);

        renderTab();

        expect(await screen.findByText("No players found.")).toBeVisible();
    });

    it("shows the error and retries", async () => {
        server.use(
            http.get("/api/ppboard/prototype/getleaderboard", () =>
                HttpResponse.json({ message: "Rework not found" }, { status: 404 }),
            ),
        );
        const user = userEvent.setup();

        renderTab();

        expect(await screen.findByRole("alert")).toHaveTextContent("Rework not found");

        answerWith(() => leaderboardPlayers);
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByText("Alpha")).toBeVisible();
    });

    it("shows a loading state instead of stale, mis-ranked rows while the next page loads", async () => {
        server.use(
            http.get("/api/ppboard/prototype/getleaderboard", async ({ request }) => {
                const page = Number(new URL(request.url).searchParams.get("page") ?? "1");

                if (page === 2) {
                    await delay(150);
                }

                const body: PrototypePlayer[] = buildPage(page, page === 1 ? 50 : 2);

                return HttpResponse.json(body);
            }),
        );
        const user = userEvent.setup();

        renderTab();
        await screen.findByText("Player 1-0");

        await user.click(screen.getByRole("button", { name: "Next page" }));

        expect(screen.getByText("Loading...")).toBeVisible();
        expect(screen.queryByText("Player 1-0")).not.toBeInTheDocument();
        expect(screen.queryByText("Player 1-49")).not.toBeInTheDocument();

        const row = (await screen.findByText("Player 2-0")).closest("tr")!;
        expect(within(row).getAllByRole("cell")[0]).toHaveTextContent("51");
    });

    it("shows a dash for a missing Master pp and falls back to live pp for its difference", async () => {
        answerWith(() => [
            buildPlayer({
                uid: 1,
                username: "WithMaster",
                localPPTotal: 1000,
                livePPTotal: 900,
                masterPPTotal: 950,
            }),
            buildPlayer({
                uid: 2,
                username: "WithoutMaster",
                localPPTotal: 1000,
                livePPTotal: 900,
            }),
        ]);

        renderTab(readingVariant);

        const withMaster = (await screen.findByText("WithMaster")).closest("tr")!;
        const withoutMaster = screen.getByText("WithoutMaster").closest("tr")!;

        expect(within(withMaster).getByText("950.00")).toBeVisible();
        expect(within(withMaster).getByText("+50.0")).toBeVisible();
        expect(within(withoutMaster).getByText("-")).toBeVisible();
        expect(within(withoutMaster).getByText("+100.0")).toBeVisible();
    });

    it("keeps the page when the search has not changed", async () => {
        const requests = answerWith((page) => buildPage(page, 50));
        const user = userEvent.setup();

        renderTab();
        await screen.findByText("Player 1-0");
        await user.click(screen.getByRole("button", { name: "Next page" }));
        await screen.findByText("Player 2-0");

        await new Promise((resolve) => setTimeout(resolve, 400));

        expect(screen.getByText("Page 2")).toBeVisible();
        expect(requests.filter((url) => url.searchParams.get("page") === "1")).toHaveLength(1);
    });
});
