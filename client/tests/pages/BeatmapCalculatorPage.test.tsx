import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CalculationResponse } from "app-structures";
import { http, HttpResponse } from "msw";
import { useLogout } from "../../src/api/auth";
import { emptyFormValues } from "../../src/calculator/calculatorForm";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { BeatmapCalculatorPage } from "../../src/pages/BeatmapCalculatorPage";
import { droidCalculation, osuCalculation, plainMe } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

const droidLiveCalculation: CalculationResponse = {
    ...droidCalculation,
    scope: "tool",
    variant: "droid-live",
    baseline: null,
    baselineResult: null,
};

const osuLiveCalculation: CalculationResponse = {
    ...osuCalculation,
    variant: "osu-live",
    baseline: null,
    baselineResult: null,
};

/** Answers every calculation with the fixture of the variant that was asked for, and records the forms. */
function serveCalculations(): FormData[] {
    const forms: FormData[] = [];
    const answers: Record<string, CalculationResponse> = {
        "droid-live": droidLiveCalculation,
        "droid-rebalance": { ...droidCalculation, scope: "tool" },
        "osu-live": osuLiveCalculation,
        "osu-rebalance": osuCalculation,
    };

    server.use(
        http.post("/api/ppboard/calculate", async ({ request }) => {
            const form = await request.formData();

            forms.push(form);

            return HttpResponse.json(answers[form.get("variant") as string]);
        }),
    );

    return forms;
}

async function calculate(beatmap = "1234") {
    await userEvent.type(screen.getByLabelText("Beatmap link or ID"), beatmap);
    await userEvent.click(screen.getByRole("button", { name: "Calculate" }));
    await screen.findByText("Total pp");
}

describe("BeatmapCalculatorPage", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    it("has a heading for the page that is not a second h1", () => {
        renderWithProviders(<BeatmapCalculatorPage />);

        expect(
            screen.getByRole("heading", { level: 2, name: "Beatmap calculator" }),
        ).toBeInTheDocument();
        expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    });

    it("offers exactly the four variants, with osu!droid live selected", () => {
        renderWithProviders(<BeatmapCalculatorPage />);

        const picker = screen.getByLabelText("Variant");

        expect(picker).toHaveValue("droid-live");
        expect(
            within(picker)
                .getAllByRole("option")
                .map((option) => [option.getAttribute("value"), option.textContent]),
        ).toEqual([
            ["droid-live", "osu!droid live"],
            ["droid-rebalance", "osu!droid rebalance"],
            ["osu-live", "osu!standard live"],
            ["osu-rebalance", "osu!standard rebalance"],
        ]);
    });

    it("calculates on osu!droid live with the tool scope and shows no Difference", async () => {
        const forms = serveCalculations();

        renderWithProviders(<BeatmapCalculatorPage />);
        await calculate();

        expect(forms[0].get("scope")).toBe("tool");
        expect(forms[0].get("variant")).toBe("droid-live");
        expect(forms[0].get("beatmap")).toBe("1234");

        const panel = screen.getByRole("article", { name: "Calculation result" });

        expect(within(panel).getByRole("heading", { name: "osu!droid live" })).toBeVisible();
        expect(within(panel).getByText("Total pp")).toBeVisible();
        expect(within(panel).getByText("Tap pp")).toBeVisible();
        expect(within(panel).queryByText("Difference")).not.toBeInTheDocument();
        expect(within(panel).queryByText("Live pp")).not.toBeInTheDocument();
    });

    it("compares osu!droid rebalance with live", async () => {
        const forms = serveCalculations();

        renderWithProviders(<BeatmapCalculatorPage />);
        await userEvent.selectOptions(screen.getByLabelText("Variant"), "droid-rebalance");
        await calculate();

        expect(forms[0].get("variant")).toBe("droid-rebalance");
        expect(screen.getByText("Difference")).toBeVisible();
        expect(screen.getByRole("heading", { name: "osu!droid rebalance" })).toBeVisible();
    });

    it("shows osu!standard's own names for osu!standard live", async () => {
        const forms = serveCalculations();

        renderWithProviders(<BeatmapCalculatorPage />);
        await userEvent.selectOptions(screen.getByLabelText("Variant"), "osu-live");
        await calculate();

        expect(forms[0].get("variant")).toBe("osu-live");
        expect(screen.getByText("Speed pp")).toBeVisible();
        expect(screen.queryByText("Tap pp")).not.toBeInTheDocument();
        expect(screen.queryByText("Difference")).not.toBeInTheDocument();
    });

    it("compares osu!standard rebalance with osu!standard live", async () => {
        serveCalculations();
        renderWithProviders(<BeatmapCalculatorPage />);
        await userEvent.selectOptions(screen.getByLabelText("Variant"), "osu-rebalance");
        await calculate();

        expect(screen.getByText("Difference")).toBeVisible();
        expect(screen.getByText("Compared with")).toBeVisible();
        expect(screen.getByText("osu-live")).toBeVisible();
    });

    it("shows the mods that were ignored for osu!standard", async () => {
        server.use(
            http.post("/api/ppboard/calculate", () =>
                HttpResponse.json({ ...osuCalculation, ignoredMods: ["TD", "AP"] }),
            ),
        );
        renderWithProviders(<BeatmapCalculatorPage />);
        await userEvent.selectOptions(screen.getByLabelText("Variant"), "osu-rebalance");
        await calculate();

        expect(screen.getByText("Ignored for osu!standard")).toBeVisible();
        expect(screen.getByText("TD, AP")).toBeVisible();
    });

    it("offers My score only for the osu!droid variants", async () => {
        renderWithProviders(<BeatmapCalculatorPage />, { me: plainMe });

        expect(await screen.findByText("Calculate my score on this beatmap")).toBeVisible();

        await userEvent.selectOptions(screen.getByLabelText("Variant"), "droid-rebalance");

        expect(screen.getByText("Calculate my score on this beatmap")).toBeVisible();

        await userEvent.selectOptions(screen.getByLabelText("Variant"), "osu-live");

        expect(screen.queryByText("Calculate my score on this beatmap")).not.toBeInTheDocument();

        await userEvent.selectOptions(screen.getByLabelText("Variant"), "osu-rebalance");

        expect(screen.queryByText("Calculate my score on this beatmap")).not.toBeInTheDocument();
    });

    it("sends the tool scope with My score", async () => {
        const forms: FormData[] = [];

        server.use(
            http.post("/api/ppboard/calculate/my-score", async ({ request }) => {
                forms.push(await request.formData());

                return HttpResponse.json(droidLiveCalculation);
            }),
        );
        renderWithProviders(<BeatmapCalculatorPage />, { me: plainMe });
        await userEvent.type(await screen.findByLabelText("Beatmap for my score"), "1234");
        await userEvent.click(screen.getByRole("button", { name: "Calculate my score" }));
        await screen.findByText("Total pp");

        expect(forms[0].get("scope")).toBe("tool");
        expect(forms[0].get("variant")).toBe("droid-live");
    });

    it("drops a My score result when the person logs out", async () => {
        let isLoggedIn = true;

        server.use(
            http.get("/api/auth/me", () =>
                isLoggedIn
                    ? HttpResponse.json(plainMe)
                    : HttpResponse.json({ message: "Not logged in" }, { status: 401 }),
            ),
            http.post("/api/auth/logout", () => {
                isLoggedIn = false;

                return new HttpResponse(null, { status: 204 });
            }),
            http.post("/api/ppboard/calculate/my-score", () =>
                HttpResponse.json(droidLiveCalculation),
            ),
        );

        function LogoutHarness() {
            const logout = useLogout();

            return (
                <>
                    <button onClick={() => logout.mutate()}>Log out</button>
                    <BeatmapCalculatorPage />
                </>
            );
        }

        renderWithProviders(<LogoutHarness />);
        await userEvent.type(await screen.findByLabelText("Beatmap for my score"), "1234");
        await userEvent.click(screen.getByRole("button", { name: "Calculate my score" }));
        await screen.findByText("Total pp");

        await userEvent.click(screen.getByRole("button", { name: "Log out" }));

        await waitFor(() => expect(screen.queryByText("Total pp")).not.toBeInTheDocument());
    });

    it("offers Generate link only when logged in", async () => {
        serveCalculations();

        const { unmount } = renderWithProviders(<BeatmapCalculatorPage />, { me: null });

        await calculate();
        expect(screen.queryByRole("button", { name: "Generate link" })).not.toBeInTheDocument();

        unmount();
        renderWithProviders(<BeatmapCalculatorPage />, { me: plainMe });
        await calculate();

        expect(await screen.findByRole("button", { name: "Generate link" })).toBeVisible();
    });

    it("starts with the variant and values it is given in the navigation state", () => {
        renderWithProviders(<BeatmapCalculatorPage />, {
            route: {
                pathname: "/calculate",
                state: {
                    calculatorVariant: "osu-live",
                    calculatorValues: { ...emptyFormValues, beatmap: "4321" },
                },
            },
        });

        expect(screen.getByLabelText("Variant")).toHaveValue("osu-live");
        expect(screen.getByLabelText("Beatmap link or ID")).toHaveValue("4321");
    });

    it("ignores a variant in the navigation state that the tool does not offer", () => {
        renderWithProviders(<BeatmapCalculatorPage />, {
            route: { pathname: "/calculate", state: { calculatorVariant: "flowaim" } },
        });

        expect(screen.getByLabelText("Variant")).toHaveValue("droid-live");
    });
});
