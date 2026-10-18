import { addRankChanges } from "../../src/scores/rankChanges";
import { buildScoresCsv } from "../../src/scores/scoreCsv";
import { scoreColumns } from "../../src/scores/scoreColumns";
import { buildScore, buildScoreState } from "../mocks/fixtures";

function pickColumns(...ids: string[]) {
    return ids.map((id) => scoreColumns.find((column) => column.id === id)!);
}

describe("buildScoresCsv", () => {
    it("writes the headers and one line per row", () => {
        const rows = addRankChanges([
            buildScore({ title: "Plain" }),
            buildScore({ title: "Other", miss: 3 }),
        ]);

        expect(buildScoresCsv(rows, pickColumns("rank", "map", "miss"))).toBe(
            "Rank,Map,Miss\r\n1,Plain,0\r\n2,Other,3",
        );
    });

    it("quotes a title with a comma and doubles the quotes in it", () => {
        const rows = addRankChanges([buildScore({ title: 'Artist - "Hi, there" [Insane]' })]);

        expect(buildScoresCsv(rows, pickColumns("map"))).toBe(
            'Map\r\n"Artist - ""Hi, there"" [Insane]"',
        );
    });

    it("quotes a title with a line break", () => {
        const rows = addRankChanges([buildScore({ title: "two\nlines" })]);

        expect(buildScoresCsv(rows, pickColumns("map"))).toBe('Map\r\n"two\nlines"');
    });

    it("writes numbers rounded to what the table shows", () => {
        const rows = addRankChanges([buildScore({ accuracy: 98.4567 })]);

        expect(buildScoresCsv(rows, pickColumns("accuracy"))).toBe("Accuracy\r\n98.46");
    });

    it("writes only the columns it is given", () => {
        const csv = buildScoresCsv(addRankChanges([buildScore()]), pickColumns("combo"));

        expect(csv).toBe("Combo\r\n1000");
    });

    it.each(["=SUM(A1)", "+1", "-1+2", "@cmd", "\tTab"])(
        "prefixes a text cell starting with %j so a spreadsheet does not run it",
        (title) => {
            const rows = addRankChanges([buildScore({ title })]);

            expect(buildScoresCsv(rows, pickColumns("map"))).toBe(`Map\r\n'${title}`);
        },
    );

    it("does not prefix numbers, even negative ones", () => {
        const rows = addRankChanges([buildScore({ local: buildScoreState(90) })]);

        expect(buildScoresCsv(rows, pickColumns("difference"))).toBe("Difference\r\n-10");
    });

    it("quotes a guarded cell that also needs quoting", () => {
        const rows = addRankChanges([buildScore({ title: "=A,B" })]);

        expect(buildScoresCsv(rows, pickColumns("map"))).toBe('Map\r\n"\'=A,B"');
    });
});
