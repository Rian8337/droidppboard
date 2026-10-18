import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MyScoreForm } from "../../src/calculator/MyScoreForm";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { CalculatorTab } from "../../src/variant/CalculatorTab";
import { droidCalculation, droidRebalance, plainMe } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

const showResult = vi.fn();

function recordForms(): FormData[] {
    const forms: FormData[] = [];

    server.use(
        http.post("/api/ppboard/calculate/my-score", async ({ request }) => {
            forms.push(await request.formData());

            return HttpResponse.json(droidCalculation);
        }),
    );

    return forms;
}

describe("MyScoreForm", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("is hidden when logged out", async () => {
        renderWithProviders(
            <MyScoreForm scope="variant" variant="droid-rebalance" showResult={showResult} />,
            {
                me: null,
            },
        );

        // The login state loads first; give it the time it needs before concluding nothing shows.
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(screen.queryByText("Calculate my score on this beatmap")).not.toBeInTheDocument();
    });

    it("is hidden for osu!standard variants", async () => {
        renderWithProviders(
            <MyScoreForm scope="tool" variant="osu-live" showResult={showResult} />,
            { me: plainMe },
        );

        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(screen.queryByText("Calculate my score on this beatmap")).not.toBeInTheDocument();
    });

    it("is shown when logged in, for osu!droid variants", async () => {
        renderWithProviders(
            <MyScoreForm scope="tool" variant="droid-live" showResult={showResult} />,
            { me: plainMe },
        );

        expect(await screen.findByText("Calculate my score on this beatmap")).toBeVisible();
        expect(screen.getByRole("button", { name: "Calculate my score" })).toBeVisible();
    });

    it("sends the beatmap with the scope and variant, and shows the result", async () => {
        const forms = recordForms();

        renderWithProviders(<CalculatorTab variant={droidRebalance} />, { me: plainMe });
        await userEvent.type(await screen.findByLabelText("Beatmap for my score"), "1234");
        await userEvent.click(screen.getByRole("button", { name: "Calculate my score" }));

        expect(await screen.findByText("Total pp")).toBeVisible();
        expect(forms).toHaveLength(1);
        expect(forms[0].get("scope")).toBe("variant");
        expect(forms[0].get("variant")).toBe("droid-rebalance");
        expect(forms[0].get("beatmap")).toBe("1234");
        expect(forms[0].has("mods")).toBe(false);
    });

    it("hands the result and the beatmap it was calculated for to the calculator", async () => {
        recordForms();
        renderWithProviders(
            <MyScoreForm scope="variant" variant="droid-rebalance" showResult={showResult} />,
            { me: plainMe },
        );
        await userEvent.type(await screen.findByLabelText("Beatmap for my score"), " 1234 ");
        await userEvent.click(screen.getByRole("button", { name: "Calculate my score" }));

        await screen.findByRole("button", { name: "Calculate my score" });
        await vi.waitFor(() => expect(showResult).toHaveBeenCalledTimes(1));
        expect(showResult.mock.calls[0][0]).toEqual(droidCalculation);
        expect(showResult.mock.calls[0][1]).toMatchObject({ beatmap: "1234", beatmapFile: null });
    });

    it("says when there is no score on the beatmap", async () => {
        server.use(
            http.post("/api/ppboard/calculate/my-score", () =>
                HttpResponse.json(
                    { message: "You have no score on this beatmap" },
                    { status: 404 },
                ),
            ),
        );
        renderWithProviders(<CalculatorTab variant={droidRebalance} />, { me: plainMe });
        await userEvent.type(await screen.findByLabelText("Beatmap for my score"), "1");
        await userEvent.click(screen.getByRole("button", { name: "Calculate my score" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "You have no score on this beatmap",
        );
        expect(screen.queryByText("Total pp")).not.toBeInTheDocument();
    });

    it("asks for a beatmap before calculating", async () => {
        const forms = recordForms();

        renderWithProviders(<CalculatorTab variant={droidRebalance} />, { me: plainMe });
        await userEvent.click(await screen.findByRole("button", { name: "Calculate my score" }));

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Please enter a valid beatmap link or ID",
        );
        expect(forms).toHaveLength(0);
    });

    it("makes a link for the score with the source my-score", async () => {
        const snapshotForms: FormData[] = [];

        recordForms();
        server.use(
            http.post("/api/ppboard/snapshots", async ({ request }) => {
                snapshotForms.push(await request.formData());

                return HttpResponse.json(
                    { id: "abc1234567", expiresAt: "2026-11-11T08:00:00.000Z" },
                    { status: 201 },
                );
            }),
        );
        renderWithProviders(<CalculatorTab variant={droidRebalance} />, { me: plainMe });
        await userEvent.type(await screen.findByLabelText("Beatmap for my score"), "1234");
        await userEvent.click(screen.getByRole("button", { name: "Calculate my score" }));
        await userEvent.click(await screen.findByRole("button", { name: "Generate link" }));
        await screen.findByText(/\/calculator\/s\/abc1234567/);

        expect(snapshotForms).toHaveLength(1);
        expect(snapshotForms[0].get("source")).toBe("my-score");
        expect(snapshotForms[0].get("scope")).toBe("variant");
        expect(snapshotForms[0].get("variant")).toBe("droid-rebalance");
        expect(snapshotForms[0].get("beatmap")).toBe("1234");
    });
});
