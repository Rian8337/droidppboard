import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CalculationResponse, CalculationSnapshot } from "app-structures";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { SnapshotPage } from "../../src/calculator/SnapshotPage";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { CalculatorTab } from "../../src/variant/CalculatorTab";
import { BeatmapCalculatorPage } from "../../src/pages/BeatmapCalculatorPage";
import { droidCalculation, droidRebalance, osuCalculation, plainMe } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

function buildSnapshot(calculation: CalculationResponse = droidCalculation): CalculationSnapshot {
    return {
        id: "abc1234567",
        createdAt: "2026-10-12T08:00:00.000Z",
        expiresAt: "2026-11-11T08:00:00.000Z",
        calculation,
    };
}

function serveSnapshot(snapshot: CalculationSnapshot) {
    server.use(http.get("/api/ppboard/snapshots/:id", () => HttpResponse.json(snapshot)));
}

function recordSnapshotForms(): FormData[] {
    const forms: FormData[] = [];

    server.use(
        http.post("/api/ppboard/snapshots", async ({ request }) => {
            forms.push(await request.formData());

            return HttpResponse.json(
                { id: "abc1234567", expiresAt: "2026-11-11T08:00:00.000Z" },
                { status: 201 },
            );
        }),
    );

    return forms;
}

async function calculate(beatmap = "1234") {
    await userEvent.type(screen.getByLabelText("Beatmap link or ID"), beatmap);
    await userEvent.click(screen.getByRole("button", { name: "Calculate" }));
    await screen.findByText("Total pp");
}

describe("Generate link", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        Reflect.deleteProperty(navigator, "clipboard");
    });

    it("is hidden when logged out", async () => {
        renderWithProviders(<CalculatorTab variant={droidRebalance} />, { me: null });
        await calculate();

        expect(screen.queryByRole("button", { name: "Generate link" })).not.toBeInTheDocument();
    });

    it("sends the form again, and shows the copyable link and when it expires", async () => {
        const forms = recordSnapshotForms();

        renderWithProviders(<CalculatorTab variant={droidRebalance} />, { me: plainMe });
        await calculate();
        await userEvent.click(await screen.findByRole("button", { name: "Generate link" }));

        const link = `${window.location.origin}/v/droid-rebalance/calculator/s/abc1234567`;

        expect(await screen.findByText(link)).toBeVisible();
        expect(screen.getByText("Expires 2026-11-11 08:00 UTC")).toBeVisible();
        expect(screen.getByRole("button", { name: "Copy" })).toBeVisible();
        expect(forms).toHaveLength(1);
        expect(forms[0].get("scope")).toBe("variant");
        expect(forms[0].get("variant")).toBe("droid-rebalance");
        expect(forms[0].get("beatmap")).toBe("1234");
        expect(forms[0].has("source")).toBe(false);
    });

    it("copies the link", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        Object.defineProperty(navigator, "clipboard", {
            value: { writeText },
            configurable: true,
        });
        recordSnapshotForms();
        renderWithProviders(<CalculatorTab variant={droidRebalance} />, { me: plainMe });
        await calculate();
        await userEvent.click(await screen.findByRole("button", { name: "Generate link" }));
        await userEvent.click(await screen.findByRole("button", { name: "Copy" }));

        expect(writeText).toHaveBeenCalledWith(
            `${window.location.origin}/v/droid-rebalance/calculator/s/abc1234567`,
        );
    });

    it("uses the Beatmap calculator's path for a tool calculation", async () => {
        recordSnapshotForms();
        server.use(http.post("/api/ppboard/calculate", () => HttpResponse.json(osuCalculation)));
        renderWithProviders(<BeatmapCalculatorPage />, { me: plainMe });
        await calculate();
        await userEvent.click(await screen.findByRole("button", { name: "Generate link" }));

        expect(
            await screen.findByText(`${window.location.origin}/calculate/s/abc1234567`),
        ).toBeVisible();
    });

    it("sends the uploaded file again", async () => {
        // jsdom's File cannot be streamed by Node's fetch, so the requests are inspected instead of sent.
        const sendRequest = vi.fn((url: string, _init?: RequestInit) =>
            Promise.resolve(
                url === "/api/auth/me"
                    ? Response.json(plainMe)
                    : url === "/api/ppboard/snapshots"
                      ? Response.json(
                            { id: "abc1234567", expiresAt: "2026-11-11T08:00:00.000Z" },
                            { status: 201 },
                        )
                      : Response.json({
                            ...droidCalculation,
                            parameters: { beatmap: { file: true }, mods: [] },
                        }),
            ),
        );

        vi.stubGlobal("fetch", sendRequest);
        renderWithProviders(<CalculatorTab variant={droidRebalance} />);
        await userEvent.upload(
            screen.getByLabelText("Beatmap file"),
            new File(["osu file format v14"], "map.osu"),
        );
        await userEvent.click(screen.getByRole("button", { name: "Calculate" }));
        await screen.findByText("Total pp");
        await userEvent.click(await screen.findByRole("button", { name: "Generate link" }));
        await screen.findByText(/\/calculator\/s\/abc1234567/);

        const call = sendRequest.mock.calls.find(([url]) => url === "/api/ppboard/snapshots");
        const form = call?.[1]?.body as FormData;

        expect((form.get("beatmapfile") as File).name).toBe("map.osu");
        expect(form.has("beatmap")).toBe(false);
    });

    it("shows why the link could not be made", async () => {
        server.use(
            http.post("/api/ppboard/snapshots", () =>
                HttpResponse.json(
                    { message: "Too many requests" },
                    { status: 429, headers: { "Retry-After": "30" } },
                ),
            ),
        );
        renderWithProviders(<CalculatorTab variant={droidRebalance} />, { me: plainMe });
        await calculate();
        await userEvent.click(await screen.findByRole("button", { name: "Generate link" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Too many requests. Try again in 30 seconds",
        );
    });

    it("starts over when a new result is shown", async () => {
        recordSnapshotForms();
        renderWithProviders(<CalculatorTab variant={droidRebalance} />, { me: plainMe });
        await calculate();
        await userEvent.click(await screen.findByRole("button", { name: "Generate link" }));
        await screen.findByText(/\/calculator\/s\/abc1234567/);
        await userEvent.click(screen.getByRole("button", { name: "Calculate" }));

        await waitFor(() =>
            expect(screen.queryByText(/\/calculator\/s\/abc1234567/)).not.toBeInTheDocument(),
        );
        expect(screen.getByRole("button", { name: "Generate link" })).toBeVisible();
    });
});

function renderSnapshotPage(route: string) {
    return renderWithProviders(
        <Routes>
            <Route path="/v/:variant/calculator/s/:id" element={<SnapshotPage scope="variant" />} />
            <Route path="/calculate/s/:id" element={<SnapshotPage scope="tool" />} />
            <Route
                path="/v/:variant/calculator"
                element={<CalculatorTab variant={droidRebalance} />}
            />
            <Route path="/calculate" element={<BeatmapCalculatorPage />} />
        </Routes>,
        { route },
    );
}

describe("SnapshotPage", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    it("shows the result, when it was taken and on which variant", async () => {
        serveSnapshot(buildSnapshot());
        renderSnapshotPage("/v/droid-rebalance/calculator/s/abc1234567");

        expect(
            await screen.findByText("Snapshot taken 2026-10-12 08:00 UTC on Rebalance"),
        ).toBeVisible();
        expect(screen.getByText("Expires 2026-11-11 08:00 UTC")).toBeVisible();

        const panel = screen.getByRole("article", { name: "Calculation result" });

        expect(within(panel).getByText("321.457")).toBeVisible();
        expect(within(panel).getByRole("heading", { name: "Rebalance" })).toBeVisible();
        expect(screen.queryByRole("button", { name: "Calculate" })).not.toBeInTheDocument();
    });

    it("names a Beatmap calculator variant by its label", async () => {
        serveSnapshot(buildSnapshot(osuCalculation));
        renderSnapshotPage("/calculate/s/abc1234567");

        expect(
            await screen.findByText(
                "Snapshot taken 2026-10-12 08:00 UTC on osu!standard rebalance",
            ),
        ).toBeVisible();
    });

    it("does not load the variants for a Beatmap calculator snapshot", async () => {
        const variantRequests = vi.fn();

        server.use(
            http.get("/api/ppboard/variants", () => {
                variantRequests();

                return HttpResponse.json([]);
            }),
        );
        serveSnapshot(buildSnapshot(osuCalculation));
        renderSnapshotPage("/calculate/s/abc1234567");
        await screen.findByRole("heading", { name: /^Snapshot taken / });

        expect(variantRequests).not.toHaveBeenCalled();
    });

    it("loads the data of the result into the calculator", async () => {
        serveSnapshot(buildSnapshot());
        renderSnapshotPage("/v/droid-rebalance/calculator/s/abc1234567");
        await userEvent.click(await screen.findByRole("button", { name: "Load data from result" }));

        expect(await screen.findByLabelText("Beatmap link or ID")).toHaveValue("1234");
        expect(screen.getByLabelText("Max combo")).toHaveValue(480);
        expect(screen.getByLabelText("Miss count")).toHaveValue(2);
    });

    it("loads the data of a Beatmap calculator result into the tool with its variant", async () => {
        serveSnapshot(buildSnapshot(osuCalculation));
        renderSnapshotPage("/calculate/s/abc1234567");
        await userEvent.click(await screen.findByRole("button", { name: "Load data from result" }));

        expect(await screen.findByLabelText("Beatmap link or ID")).toHaveValue("1234");
        expect(screen.getByLabelText("Rework")).toHaveValue("osu-rebalance");
    });

    it("cannot load the data of a result for an uploaded file", async () => {
        serveSnapshot(
            buildSnapshot({
                ...droidCalculation,
                parameters: { beatmap: { file: true }, mods: [] },
            }),
        );
        renderSnapshotPage("/v/droid-rebalance/calculator/s/abc1234567");

        expect(await screen.findByRole("button", { name: "Load data from result" })).toBeDisabled();
        expect(screen.getByText("Not available for uploaded beatmaps")).toBeVisible();
    });

    it("says an expired snapshot has expired, with a link to the calculator", async () => {
        server.use(
            http.get("/api/ppboard/snapshots/:id", () =>
                HttpResponse.json({ message: "This snapshot has expired" }, { status: 410 }),
            ),
        );
        renderSnapshotPage("/v/droid-rebalance/calculator/s/abc1234567");

        expect(await screen.findByText("This snapshot has expired")).toBeVisible();
        expect(screen.getByRole("link", { name: "Open the calculator" })).toHaveAttribute(
            "href",
            "/v/droid-rebalance/calculator",
        );
    });

    it("links an expired Beatmap calculator snapshot to the Beatmap calculator", async () => {
        server.use(
            http.get("/api/ppboard/snapshots/:id", () =>
                HttpResponse.json({ message: "This snapshot has expired" }, { status: 410 }),
            ),
        );
        renderSnapshotPage("/calculate/s/abc1234567");

        expect(await screen.findByRole("link", { name: "Open the calculator" })).toHaveAttribute(
            "href",
            "/calculate",
        );
    });

    it("shows a snapshot of a private variant that the person cannot see exactly as an unknown one", async () => {
        server.use(
            http.get("/api/ppboard/snapshots/:id", () =>
                HttpResponse.json({ message: "Snapshot not found" }, { status: 404 }),
            ),
        );

        const unknown = renderSnapshotPage("/v/nonexistent/calculator/s/zzzzzzzzzz");

        expect(await screen.findByText("Snapshot not found")).toBeVisible();

        const unknownHtml = unknown.container.innerHTML;

        unknown.unmount();

        const hidden = renderSnapshotPage("/v/flowaim/calculator/s/abc1234567");

        expect(await screen.findByText("Snapshot not found")).toBeVisible();
        expect(hidden.container.innerHTML).toBe(unknownHtml);
        expect(hidden.container).not.toHaveTextContent(/flow ?aim/i);
    });

    it("shows other errors with a way to try again", async () => {
        server.use(
            http.get("/api/ppboard/snapshots/:id", () =>
                HttpResponse.json({ message: "The rework list is unavailable" }, { status: 503 }),
            ),
        );
        renderSnapshotPage("/v/droid-rebalance/calculator/s/abc1234567");

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "The rework list is unavailable",
        );
        expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
    });
});
