import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IPrototypePP, PrototypeLeaderboardResponse } from "app-structures";
import { http, HttpResponse } from "msw";
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
function answerWith(rowsFor: (page: number) => IPrototypePP[], variant = droidRebalance): URL[] {
    const requests: URL[] = [];

    server.use(
        http.get("/api/ppboard/prototype/getleaderboard", ({ request }) => {
            const url = new URL(request.url);
            requests.push(url);

            const body: PrototypeLeaderboardResponse<IPrototypePP[]> = {
                variants: [droidRebalance, readingVariant],
                currentVariant: variant,
                data: rowsFor(Number(url.searchParams.get("page") ?? "1")),
            };

            return HttpResponse.json(body);
        }),
    );

    return requests;
}

function buildPage(page: number, size: number): IPrototypePP[] {
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
        answerWith(() => withMaster, readingVariant);

        const { unmount } = renderTab(readingVariant);

        expect(await screen.findByRole("columnheader", { name: "Master pp" })).toBeVisible();
        expect(screen.getAllByText("1234.50")).toHaveLength(3);

        unmount();
        answerWith(() => withMaster, droidRebalance);
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
                HttpResponse.json({ message: "Variant not found" }, { status: 404 }),
            ),
        );
        const user = userEvent.setup();

        renderTab();

        expect(await screen.findByRole("alert")).toHaveTextContent("Variant not found");

        answerWith(() => leaderboardPlayers);
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByText("Alpha")).toBeVisible();
    });
});
