import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ScoreMultiplierPage } from "../../src/pages/ScoreMultiplierPage";
import { multiplierSample } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

function serveSample(): URL[] {
    const requests: URL[] = [];

    server.use(
        http.get("/api/ppboard/score-multiplier-sample", ({ request }) => {
            requests.push(new URL(request.url));

            return HttpResponse.json(multiplierSample);
        }),
    );

    return requests;
}

describe("ScoreMultiplierPage", () => {
    beforeEach(() => localStorage.clear());

    it("shows the old and new multipliers of each mod", () => {
        renderWithProviders(<ScoreMultiplierPage />);

        const row = screen.getByRole("rowheader", { name: "DT / NC" }).closest("tr")!;

        expect(within(row).getByText("1.12")).toBeVisible();
        expect(within(row).getByText("1.23")).toBeVisible();
    });

    it("sends the beatmap and the picked mods as acronyms", async () => {
        const requests = serveSample();

        renderWithProviders(<ScoreMultiplierPage />);
        await userEvent.type(screen.getByLabelText("Beatmap ID or link"), " 1234 ");
        await userEvent.click(screen.getByRole("button", { name: "Select mods" }));
        await userEvent.click(screen.getByRole("checkbox", { name: /hidden/i }));
        await userEvent.click(screen.getByRole("checkbox", { name: /double time/i }));
        await userEvent.click(screen.getByRole("button", { name: "Sample" }));

        expect(await screen.findByText("Artist - Sample Song [Insane]")).toBeVisible();
        expect(requests).toHaveLength(1);
        expect(requests[0].searchParams.get("beatmapId")).toBe("1234");
        expect(requests[0].searchParams.get("mods")).toBe("HDDT");
    });

    it("leaves mods out when none are picked", async () => {
        const requests = serveSample();

        renderWithProviders(<ScoreMultiplierPage />);
        await userEvent.type(screen.getByLabelText("Beatmap ID or link"), "1234");
        await userEvent.click(screen.getByRole("button", { name: "Sample" }));

        await screen.findByText("Artist - Sample Song [Insane]");

        expect(requests[0].searchParams.has("mods")).toBe(false);
    });

    it("does not offer the mod settings", async () => {
        renderWithProviders(<ScoreMultiplierPage />);
        await userEvent.click(screen.getByRole("button", { name: "Select mods" }));
        await userEvent.click(screen.getByRole("checkbox", { name: /custom speed/i }));

        expect(screen.queryByLabelText(/track rate multiplier/i)).not.toBeInTheDocument();
    });

    it("lists the scores with both multipliers and sorts them by a clicked header", async () => {
        serveSample();
        renderWithProviders(<ScoreMultiplierPage />);
        await userEvent.type(screen.getByLabelText("Beatmap ID or link"), "1234");
        await userEvent.click(screen.getByRole("button", { name: "Sample" }));

        await screen.findByText("5001");

        expect(screen.getByText("1.30×")).toBeVisible();
        expect(screen.getByText("98.76%")).toBeVisible();
        expect(screen.getByText("NM")).toBeVisible();

        const uids = () =>
            within(screen.getAllByRole("table").at(-1)!)
                .getAllByRole("row")
                .slice(1)
                .map((row) => within(row).getAllByRole("cell")[1].textContent);

        expect(uids()).toEqual(["5001", "5002"]);

        await userEvent.click(screen.getByRole("button", { name: /^Prev ×/ }));
        await userEvent.click(screen.getByRole("button", { name: /^Prev ×/ }));

        expect(uids()).toEqual(["5002", "5001"]);
    });

    it("shows the server's message when the beatmap is not found", async () => {
        server.use(
            http.get("/api/ppboard/score-multiplier-sample", () =>
                HttpResponse.json({ message: "Beatmap not found" }, { status: 404 }),
            ),
        );
        renderWithProviders(<ScoreMultiplierPage />);
        await userEvent.type(screen.getByLabelText("Beatmap ID or link"), "1");
        await userEvent.click(screen.getByRole("button", { name: "Sample" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Beatmap not found");
    });
});
