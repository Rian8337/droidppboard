import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { WhitelistPage } from "../../src/pages/WhitelistPage";
import { buildWhitelistedBeatmap, whitelistedBeatmaps } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

function serveWhitelist(): URL[] {
    const requests: URL[] = [];

    server.use(
        http.get("/api/ppboard/getwhitelist", ({ request }) => {
            requests.push(new URL(request.url));

            return HttpResponse.json(whitelistedBeatmaps);
        }),
    );

    return requests;
}

describe("WhitelistPage", () => {
    it("lists the beatmaps with a link to each osu! page", async () => {
        serveWhitelist();
        renderWithProviders(<WhitelistPage />);

        const link = await screen.findByRole("link", { name: "Alpha - First Song [Hard]" });

        expect(link).toHaveAttribute("href", "https://osu.ppy.sh/b/11");
        expect(screen.getByRole("columnheader", { name: /BPM/ })).toBeVisible();
    });

    it("asks for the first page without a query at first", async () => {
        const requests = serveWhitelist();

        renderWithProviders(<WhitelistPage />);
        await screen.findByText("Alpha - First Song [Hard]");

        expect(requests).toHaveLength(1);
        expect(requests[0].searchParams.get("page")).toBe("1");
        expect(requests[0].searchParams.has("query")).toBe(false);
    });

    it("sends what is typed in the search as the query", async () => {
        const requests = serveWhitelist();

        renderWithProviders(<WhitelistPage />);
        await screen.findByText("Alpha - First Song [Hard]");
        await userEvent.type(screen.getByLabelText("Search beatmaps"), "cs>=4 logic");

        await waitFor(() => expect(requests.at(-1)?.searchParams.get("query")).toBe("cs>=4 logic"));
        expect(requests.at(-1)?.searchParams.get("page")).toBe("1");
    });

    it("sorts on the server by the clicked header, descending first and then ascending", async () => {
        const requests = serveWhitelist();

        renderWithProviders(<WhitelistPage />);
        await screen.findByText("Alpha - First Song [Hard]");

        await userEvent.click(screen.getByRole("button", { name: "AR" }));
        await waitFor(() => expect(requests.at(-1)?.searchParams.get("query")).toBe("sort=-ar"));

        await userEvent.click(screen.getByRole("button", { name: "AR" }));
        await waitFor(() => expect(requests.at(-1)?.searchParams.get("query")).toBe("sort=ar"));
    });

    it("keeps the search words when a header sorts", async () => {
        const requests = serveWhitelist();

        renderWithProviders(<WhitelistPage />);
        await screen.findByText("Alpha - First Song [Hard]");
        await userEvent.type(screen.getByLabelText("Search beatmaps"), "od>=8");
        await waitFor(() => expect(requests.at(-1)?.searchParams.get("query")).toBe("od>=8"));

        await userEvent.click(screen.getByRole("button", { name: "Beatmap" }));

        await waitFor(() =>
            expect(requests.at(-1)?.searchParams.get("query")).toBe("od>=8 sort=-mapname"),
        );
    });

    it("pages forward only while a full page of 30 came back", async () => {
        const requests: URL[] = [];

        server.use(
            http.get("/api/ppboard/getwhitelist", ({ request }) => {
                requests.push(new URL(request.url));

                return HttpResponse.json(
                    Array.from({ length: 30 }, (_, index) =>
                        buildWhitelistedBeatmap({ mapid: index + 1, mapname: `Map ${index + 1}` }),
                    ),
                );
            }),
        );
        renderWithProviders(<WhitelistPage />);
        await screen.findByText("Map 1");

        await userEvent.click(screen.getByRole("button", { name: "Next page" }));

        await waitFor(() => expect(requests.at(-1)?.searchParams.get("page")).toBe("2"));
    });

    it("explains the filter syntax in a collapsible section", async () => {
        serveWhitelist();
        renderWithProviders(<WhitelistPage />);

        const section = screen.getByText("How to filter").closest("details");

        expect(section).not.toBeNull();
        expect(section).not.toHaveAttribute("open");
        expect(within(section!).getByText("Filter Options")).toBeInTheDocument();
        expect(within(section!).getByText("cs>=4.2 cs<=5 sort=cs")).toBeInTheDocument();
    });

    it("shows a message when nothing matches", async () => {
        server.use(http.get("/api/ppboard/getwhitelist", () => HttpResponse.json([])));
        renderWithProviders(<WhitelistPage />);

        expect(await screen.findByText("No beatmaps found.")).toBeVisible();
    });

    it("shows the error when the server refuses", async () => {
        server.use(
            http.get("/api/ppboard/getwhitelist", () =>
                HttpResponse.json({ message: "Slow down" }, { status: 429 }),
            ),
        );
        renderWithProviders(<WhitelistPage />);

        expect(await screen.findByRole("alert")).toHaveTextContent("Slow down");
    });
});
