import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScoreTable } from "../../src/scores/ScoreTable";
import { buildScore, buildScoreState } from "../mocks/fixtures";

const scores = [
    buildScore({
        hash: "a",
        title: "Alpha Song",
        combo: 1000,
        maxCombo: 1000,
        miss: 0,
        live: buildScoreState(100),
        local: buildScoreState(130),
    }),
    buildScore({
        hash: "b",
        title: "Bravo Tune",
        combo: 800,
        maxCombo: 1000,
        miss: 7,
        live: buildScoreState(100),
        local: buildScoreState(90),
    }),
];

function getBodyRows(): HTMLElement[] {
    return screen.getAllByRole("row").slice(1);
}

describe("ScoreTable", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("shows the default columns and leaves the rest hidden", () => {
        render(<ScoreTable scores={scores} storageKey="columns" />);

        for (const name of ["Rank", "Map", "Live", "Local", "Difference", "Miss", "OD"]) {
            expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
        }

        expect(screen.queryByRole("columnheader", { name: "Aim pp" })).not.toBeInTheDocument();
        expect(screen.queryByRole("columnheader", { name: "Player" })).not.toBeInTheDocument();
    });

    it("sorts by local pp, highest first, until another column is chosen", async () => {
        render(<ScoreTable scores={scores} storageKey="columns" />);

        expect(within(getBodyRows()[0]).getByText("Alpha Song")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: /Difference/ }));
        await userEvent.click(screen.getByRole("button", { name: /Difference/ }));

        expect(within(getBodyRows()[0]).getByText("Bravo Tune")).toBeInTheDocument();
    });

    it("adds a Player column when asked", () => {
        render(
            <ScoreTable
                scores={scores.map((score) => ({ ...score, username: "Someone" }))}
                showPlayer
                storageKey="columns"
            />,
        );

        expect(screen.getByRole("columnheader", { name: "Player" })).toBeInTheDocument();
        expect(screen.getAllByText("Someone")).toHaveLength(2);
    });

    it("filters by the map search", async () => {
        render(<ScoreTable scores={scores} storageKey="columns" />);

        await userEvent.type(screen.getByRole("searchbox", { name: "Search map" }), "bravo");

        expect(screen.queryByText("Alpha Song")).not.toBeInTheDocument();
        expect(screen.getByText("Bravo Tune")).toBeInTheDocument();
    });

    it("hides a column unticked in Columns and remembers it across remounts", async () => {
        const { unmount } = render(<ScoreTable scores={scores} storageKey="columns" />);

        await userEvent.click(screen.getByRole("button", { name: "Columns" }));
        await userEvent.click(screen.getByRole("checkbox", { name: "Combo" }));

        expect(screen.queryByRole("columnheader", { name: "Combo" })).not.toBeInTheDocument();

        unmount();
        render(<ScoreTable scores={scores} storageKey="columns" />);

        expect(screen.queryByRole("columnheader", { name: "Combo" })).not.toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Miss" })).toBeInTheDocument();
    });

    it("shows a hidden column when it is ticked", async () => {
        render(<ScoreTable scores={scores} storageKey="columns" />);

        await userEvent.click(screen.getByRole("button", { name: "Columns" }));
        await userEvent.click(screen.getByRole("checkbox", { name: "Aim pp" }));

        expect(screen.getByRole("columnheader", { name: "Aim pp" })).toBeInTheDocument();
    });

    it("keeps each storage key's choice apart", async () => {
        const { unmount } = render(<ScoreTable scores={scores} storageKey="profile" />);

        await userEvent.click(screen.getByRole("button", { name: "Columns" }));
        await userEvent.click(screen.getByRole("checkbox", { name: "Combo" }));
        unmount();
        render(<ScoreTable scores={scores} storageKey="top" />);

        expect(screen.getByRole("columnheader", { name: "Combo" })).toBeInTheDocument();
    });

    it("highlights full combos green, misses red, and differences green or red", () => {
        render(<ScoreTable scores={scores} storageKey="columns" />);

        const [alpha, bravo] = getBodyRows();

        expect(within(alpha).getByText("1000")).toHaveAttribute("data-tone", "up");
        expect(within(bravo).getByText("800")).not.toHaveAttribute("data-tone");
        expect(within(bravo).getByText("7")).toHaveAttribute("data-tone", "down");
        expect(within(alpha).getByText("+30.00")).toHaveAttribute("data-tone", "up");
        expect(within(bravo).getByText("-10.00")).toHaveAttribute("data-tone", "down");
    });

    it("shows a rank change as an arrow with the number of places", () => {
        render(
            <ScoreTable
                scores={[
                    buildScore({
                        hash: "a",
                        live: buildScoreState(100),
                        local: buildScoreState(90),
                    }),
                    buildScore({
                        hash: "b",
                        live: buildScoreState(80),
                        local: buildScoreState(95),
                    }),
                ]}
                storageKey="columns"
            />,
        );

        expect(screen.getByLabelText("Moved up 1 place")).toHaveAttribute("data-tone", "up");
        expect(screen.getByLabelText("Moved down 1 place")).toHaveAttribute("data-tone", "down");
    });

    it("exports the visible rows and columns", async () => {
        const createObjectUrl = vi.fn(() => "blob:csv");
        const revokeObjectUrl = vi.fn();
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

        Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl });
        render(<ScoreTable scores={scores} storageKey="columns" />);
        await userEvent.type(screen.getByRole("searchbox", { name: "Search map" }), "alpha");
        await userEvent.click(screen.getByRole("button", { name: "Export to CSV" }));

        expect(click).toHaveBeenCalledOnce();

        const blob = (createObjectUrl.mock.calls[0] as unknown as [Blob])[0];
        const text = await blob.text();

        expect(text).toContain("Alpha Song");
        expect(text).not.toContain("Bravo Tune");
        expect(text.split("\r\n")[0]).toContain("Rank,Map,Live,Local,Difference");
        expect(revokeObjectUrl).toHaveBeenCalledWith("blob:csv");
    });

    it("tells when no score is left", async () => {
        render(<ScoreTable scores={scores} storageKey="columns" />);

        await userEvent.type(screen.getByRole("searchbox", { name: "Search map" }), "zzz");

        expect(screen.getByText("No scores found.")).toBeInTheDocument();
    });
});
