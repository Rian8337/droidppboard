import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toBlob, toPng } from "html-to-image";
import { http, HttpResponse } from "msw";
import { CalculatorView } from "../../src/calculator/CalculatorView";
import { emptyFormValues } from "../../src/calculator/calculatorForm";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { CalculatorTab } from "../../src/variant/CalculatorTab";
import { droidCalculation, droidRebalance } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));
vi.mock("html-to-image", () => ({
    toPng: vi.fn(),
    toBlob: vi.fn(),
}));

function recordForms(): FormData[] {
    const forms: FormData[] = [];

    server.use(
        http.post("/api/ppboard/calculate", async ({ request }) => {
            forms.push(await request.formData());

            return HttpResponse.json(droidCalculation);
        }),
    );

    return forms;
}

async function calculate(beatmap = "1234") {
    await userEvent.type(screen.getByLabelText("Beatmap link or ID"), beatmap);
    await userEvent.click(screen.getByRole("button", { name: "Calculate" }));
    await screen.findByText("Total pp");
}

function stubClipboard(clipboard: Partial<Clipboard>) {
    Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
}

describe("CalculatorView", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
        vi.mocked(toPng).mockResolvedValue("data:image/png;base64,AAAA");
        vi.mocked(toBlob).mockResolvedValue(new Blob(["png"], { type: "image/png" }));
        localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        Reflect.deleteProperty(navigator, "clipboard");
        vi.clearAllMocks();
    });

    it("shows the fields of an imaginary score", () => {
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);

        expect(screen.getByRole("heading", { name: "Calculate an imaginary score" })).toBeVisible();

        for (const label of [
            "Beatmap link or ID",
            "Beatmap file",
            "Max combo",
            "Accuracy (%)",
            "Legacy total score",
            "100 count",
            "50 count",
            "Miss count",
            "Large tick misses",
            "Slider tail misses",
        ]) {
            expect(screen.getByLabelText(label)).toBeVisible();
        }

        expect(screen.getByRole("button", { name: "Select mods" })).toBeVisible();
        expect(
            screen.getByText(
                "If you include any of the fields below, the accuracy field will be ignored, but the result will be more precise.",
            ),
        ).toBeVisible();
    });

    it("shows Total pp, Live pp and Difference after calculating an ID", async () => {
        const forms = recordForms();

        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();

        expect(forms).toHaveLength(1);
        expect(forms[0].get("scope")).toBe("variant");
        expect(forms[0].get("variant")).toBe("droid-rebalance");
        expect(forms[0].get("beatmap")).toBe("1234");

        const panel = screen.getByRole("article", { name: "Calculation result" });

        expect(within(panel).getByText("Total pp")).toBeVisible();
        expect(within(panel).getByText("321.457")).toBeVisible();
        expect(within(panel).getByText("Live pp")).toBeVisible();
        expect(within(panel).getByText("300.123")).toBeVisible();
        expect(within(panel).getByText("Difference")).toBeVisible();
        expect(within(panel).getByText("+21.333")).toBeVisible();
        expect(within(panel).getByText("Tap pp")).toBeVisible();
        expect(within(panel).getByAltText("Strain graph")).toHaveAttribute(
            "src",
            "data:image/png;base64,iVBORw0KGgo=",
        );
    });

    it("asks for a beatmap before calculating", async () => {
        const forms = recordForms();

        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await userEvent.click(screen.getByRole("button", { name: "Calculate" }));

        expect(screen.getByRole("alert")).toHaveTextContent(
            "Please enter a valid beatmap file, link or ID",
        );
        expect(forms).toHaveLength(0);
    });

    it("shows the server's error", async () => {
        server.use(
            http.post("/api/ppboard/calculate", () =>
                HttpResponse.json({ message: "Beatmap not found" }, { status: 404 }),
            ),
        );

        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await userEvent.type(screen.getByLabelText("Beatmap link or ID"), "1");
        await userEvent.click(screen.getByRole("button", { name: "Calculate" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Beatmap not found");
    });

    it("sends the score fields that were filled in", async () => {
        const forms = recordForms();

        renderWithProviders(<CalculatorView scope="tool" variant="droid-live" />);
        await userEvent.type(screen.getByLabelText("Beatmap link or ID"), "9");
        await userEvent.type(screen.getByLabelText("Max combo"), "300");
        await userEvent.type(screen.getByLabelText("Miss count"), "1");
        await userEvent.click(screen.getByRole("button", { name: "Calculate" }));
        await screen.findByText("Total pp");

        expect(forms[0].get("scope")).toBe("tool");
        expect(forms[0].get("variant")).toBe("droid-live");
        expect(forms[0].get("combo")).toBe("300");
        expect(forms[0].get("nmiss")).toBe("1");
        expect(forms[0].has("accuracy")).toBe(false);
    });

    it("sends an uploaded .osu file as beatmapfile", async () => {
        // jsdom's File cannot be streamed by Node's fetch, so the request is inspected instead of sent.
        const sendRequest = vi.fn().mockResolvedValue(Response.json(droidCalculation));

        vi.stubGlobal("fetch", sendRequest);
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await userEvent.upload(
            screen.getByLabelText("Beatmap file"),
            new File(["osu file format v14"], "map.osu"),
        );
        await userEvent.click(screen.getByRole("button", { name: "Calculate" }));
        await screen.findByText("Total pp");

        const form = sendRequest.mock.calls[0][1].body as FormData;

        expect(sendRequest.mock.calls[0][0]).toBe("/api/ppboard/calculate");
        expect((form.get("beatmapfile") as File).name).toBe("map.osu");
        expect(form.has("beatmap")).toBe(false);
    });

    it("refills the form from the result with Load data from result", async () => {
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);

        expect(screen.getByRole("button", { name: "Load data from result" })).toBeDisabled();

        await calculate("55");
        await userEvent.click(screen.getByRole("button", { name: "Load data from result" }));

        expect(screen.getByLabelText("Beatmap link or ID")).toHaveValue("1234");
        expect(screen.getByLabelText("Max combo")).toHaveValue(480);
        expect(screen.getByLabelText("Accuracy (%)")).toHaveValue(98.5);
        expect(screen.getByLabelText("Miss count")).toHaveValue(2);
        expect(screen.getByLabelText("100 count")).toHaveValue(null);
    });

    it("cannot load the data of a result for an uploaded file", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                Response.json({
                    ...droidCalculation,
                    parameters: { beatmap: { file: true }, mods: [] },
                }),
            ),
        );

        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await userEvent.upload(
            screen.getByLabelText("Beatmap file"),
            new File(["osu file format v14"], "map.osu"),
        );
        await userEvent.click(screen.getByRole("button", { name: "Calculate" }));
        await screen.findByText("Total pp");

        expect(screen.getByRole("button", { name: "Load data from result" })).toBeDisabled();
    });

    it("empties the form but keeps the result with Reset", async () => {
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();
        await userEvent.type(screen.getByLabelText("Max combo"), "5");
        await userEvent.click(screen.getByRole("button", { name: "Reset" }));
        await userEvent.click(
            within(await screen.findByRole("dialog")).getByRole("button", { name: "Reset" }),
        );

        expect(screen.getByLabelText("Beatmap link or ID")).toHaveValue("");
        expect(screen.getByLabelText("Max combo")).toHaveValue(null);
        expect(screen.getByText("Total pp")).toBeVisible();
    });

    it("resets an empty form without asking", async () => {
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await userEvent.click(screen.getByRole("button", { name: "Reset" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("starts from the values it is given", () => {
        renderWithProviders(
            <CalculatorView
                scope="variant"
                variant="droid-rebalance"
                initialValues={{ ...emptyFormValues, beatmap: "777", combo: "12" }}
            />,
        );

        expect(screen.getByLabelText("Beatmap link or ID")).toHaveValue("777");
        expect(screen.getByLabelText("Max combo")).toHaveValue(12);
    });

    it("opens the raw response with the strain chart shortened", async () => {
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();
        await userEvent.click(screen.getByRole("button", { name: "Show raw response" }));

        const dialog = screen.getByRole("dialog");

        expect(within(dialog).getByText(/"variant": "droid-rebalance"/)).toBeVisible();
        expect(within(dialog).getByText(/"strainChart": "<base64 PNG, 8 bytes>"/)).toBeVisible();
        expect(within(dialog).queryByText(/iVBORw0KGgo/)).not.toBeInTheDocument();
        expect(within(dialog).getByRole("button", { name: "Copy to clipboard" })).toBeVisible();
    });

    it("copies the raw response", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        stubClipboard({ writeText });
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();
        await userEvent.click(screen.getByRole("button", { name: "Show raw response" }));
        await userEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));

        expect(writeText).toHaveBeenCalledWith(
            expect.stringContaining('"variant": "droid-rebalance"'),
        );
    });

    it("copies the whole raw response, strain chart included, although it shows the chart shortened", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        stubClipboard({ writeText });
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();
        await userEvent.click(screen.getByRole("button", { name: "Show raw response" }));
        await userEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));

        const copied = writeText.mock.calls[0][0] as string;

        expect(copied).toContain('"strainChart": "iVBORw0KGgo="');
        expect(JSON.parse(copied)).toEqual(droidCalculation);
    });

    it("titles the result panel with the title it is given for the variant", async () => {
        renderWithProviders(
            <CalculatorView
                scope="variant"
                variant="droid-rebalance"
                getVariantTitle={(name) => `Title of ${name}`}
            />,
        );
        await calculate();

        expect(screen.getByRole("heading", { name: "Title of droid-rebalance" })).toBeVisible();
    });

    it("titles the result panel with the variant's name when there is no title", async () => {
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();

        expect(screen.getByRole("heading", { name: "droid-rebalance" })).toBeVisible();
    });

    it("clears a previous calculation error with Reset", async () => {
        server.use(
            http.post("/api/ppboard/calculate", () =>
                HttpResponse.json({ message: "Beatmap not found" }, { status: 404 }),
            ),
        );

        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await userEvent.type(screen.getByLabelText("Beatmap link or ID"), "1");
        await userEvent.click(screen.getByRole("button", { name: "Calculate" }));
        await screen.findByRole("alert");
        await userEvent.click(screen.getByRole("button", { name: "Reset" }));
        await userEvent.click(
            within(await screen.findByRole("dialog")).getByRole("button", { name: "Reset" }),
        );

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("downloads the result panel as a PNG", async () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();
        await userEvent.click(screen.getByRole("button", { name: "Export as image" }));
        await userEvent.click(screen.getByRole("menuitem", { name: "Download PNG" }));

        await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
        expect(toPng).toHaveBeenCalledWith(
            screen.getByRole("article", { name: "Calculation result" }),
            expect.anything(),
        );
        expect(click.mock.contexts[0]).toMatchObject({
            download: "droid-rebalance-1234.png",
            href: "data:image/png;base64,AAAA",
        });

        click.mockRestore();
    });

    it("hides Copy to clipboard when images cannot be copied", async () => {
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();
        await userEvent.click(screen.getByRole("button", { name: "Export as image" }));

        expect(
            screen.queryByRole("menuitem", { name: "Copy to clipboard" }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Download PNG" })).toBeVisible();
    });

    it("copies the result panel as an image when the browser can", async () => {
        const write = vi.fn().mockResolvedValue(undefined);

        vi.stubGlobal(
            "ClipboardItem",
            class {
                constructor(readonly items: Record<string, unknown>) {}
            },
        );
        stubClipboard({ write });
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();
        await userEvent.click(screen.getByRole("button", { name: "Export as image" }));
        await userEvent.click(screen.getByRole("menuitem", { name: "Copy to clipboard" }));

        await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
        expect(toBlob).toHaveBeenCalled();
        expect(await screen.findByText("Copied to clipboard")).toBeVisible();
    });

    it("scrolls to the result below the form on a phone", async () => {
        const scrollIntoView = vi.fn();

        vi.mocked(useBreakpoint).mockReturnValue("phone");
        Element.prototype.scrollIntoView = scrollIntoView;
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();

        expect(scrollIntoView).toHaveBeenCalled();
    });

    it("does not scroll on a desktop", async () => {
        const scrollIntoView = vi.fn();

        Element.prototype.scrollIntoView = scrollIntoView;
        renderWithProviders(<CalculatorView scope="variant" variant="droid-rebalance" />);
        await calculate();

        expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it("renders the variant picker and the slots for generating a link and calculating my score", async () => {
        renderWithProviders(
            <CalculatorView
                scope="tool"
                variant="droid-live"
                variantPicker={<p>Pick a variant</p>}
                renderGenerateLink={(response) => <button>Link for {response.variant}</button>}
                renderMyScore={(showResult) => (
                    <button onClick={() => showResult(droidCalculation, emptyFormValues)}>
                        My score
                    </button>
                )}
            />,
        );

        expect(screen.getByText("Pick a variant")).toBeVisible();
        expect(screen.queryByRole("button", { name: /Link for/ })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "My score" }));

        expect(screen.getByText("Total pp")).toBeVisible();
        expect(screen.getByRole("button", { name: "Link for droid-rebalance" })).toBeVisible();
    });
});

describe("CalculatorTab", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
    });

    it("titles the result with the variant's title", async () => {
        recordForms();
        renderWithProviders(<CalculatorTab variant={droidRebalance} />);
        await calculate();

        expect(screen.getByRole("heading", { name: "Rebalance" })).toBeVisible();
    });

    it("calculates on the variant of the tab", async () => {
        const forms = recordForms();

        renderWithProviders(<CalculatorTab variant={droidRebalance} />);
        await calculate();

        expect(forms[0].get("scope")).toBe("variant");
        expect(forms[0].get("variant")).toBe("droid-rebalance");
    });

    it("fills the form from the values in the navigation state", () => {
        renderWithProviders(<CalculatorTab variant={droidRebalance} />, {
            route: {
                pathname: "/v/droid-rebalance/calculator",
                state: { calculatorValues: { ...emptyFormValues, beatmap: "4321" } },
            },
        });

        expect(screen.getByLabelText("Beatmap link or ID")).toHaveValue("4321");
    });
});
