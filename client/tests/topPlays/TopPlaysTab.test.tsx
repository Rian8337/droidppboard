import { renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createQueryClient } from "../../src/api/queryClient";
import { useTopPlays } from "../../src/api/topPlays";
import { useBreakpoint } from "../../src/hooks/useBreakpoint";
import { TopPlaysTab } from "../../src/topPlays/TopPlaysTab";
import { droidRebalance, readingVariant, topPlays } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

vi.mock("../../src/hooks/useBreakpoint", () => ({ useBreakpoint: vi.fn() }));

function recordRequests(): URL[] {
    const requests: URL[] = [];

    server.use(
        http.get("/api/ppboard/prototype/gettopplays", ({ request }) => {
            requests.push(new URL(request.url));

            return HttpResponse.json({
                variants: [droidRebalance, readingVariant],
                currentVariant: droidRebalance,
                data: topPlays,
            });
        }),
    );

    return requests;
}

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={createQueryClient({ retry: false })}>
            {children}
        </QueryClientProvider>
    );
}

describe("TopPlaysTab", () => {
    beforeEach(() => {
        vi.mocked(useBreakpoint).mockReturnValue("desktop");
        localStorage.clear();
    });

    it("shows every player's plays with the Player column", async () => {
        renderWithProviders(<TopPlaysTab variant={droidRebalance} />);

        expect(await screen.findByText("Alpha Song")).toBeVisible();
        expect(screen.getByRole("columnheader", { name: "Player" })).toBeVisible();
        expect(screen.getByText("Alpha")).toBeVisible();
        expect(screen.getByText("Bravo")).toBeVisible();
    });

    it("asks for the variant's plays without a mods parameter", async () => {
        const requests = recordRequests();

        renderWithProviders(<TopPlaysTab variant={readingVariant} />);

        await screen.findByText("Alpha Song");

        expect(requests).toHaveLength(1);
        expect(requests[0].searchParams.get("type")).toBe("reading");
        expect(requests[0].searchParams.has("mods")).toBe(false);
    });

    it("remembers its columns as top-plays-columns", async () => {
        renderWithProviders(<TopPlaysTab variant={droidRebalance} />);

        await screen.findByText("Alpha Song");

        await userEvent.click(screen.getByRole("button", { name: "Columns" }));
        await userEvent.click(screen.getByRole("checkbox", { name: "Miss" }));

        expect(localStorage.getItem("top-plays-columns")).not.toBeNull();
    });

    it("shows an error with a retry when the plays cannot be loaded", async () => {
        server.use(
            http.get("/api/ppboard/prototype/gettopplays", () =>
                HttpResponse.json({ message: "Too many requests" }, { status: 429 }),
            ),
        );

        renderWithProviders(<TopPlaysTab variant={droidRebalance} />);

        expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
    });
});

describe("useTopPlays", () => {
    it("sends the picked mods as joined acronyms", async () => {
        const requests = recordRequests();

        const { result } = renderHook(() => useTopPlays("droid-rebalance", ["HD", "DT"]), {
            wrapper,
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(requests[0].searchParams.get("mods")).toBe("HDDT");
        expect(requests[0].searchParams.get("type")).toBe("droid-rebalance");
    });

    it("asks again when the mods change", async () => {
        const requests = recordRequests();

        const { result, rerender } = renderHook(
            ({ mods }) => useTopPlays("droid-rebalance", mods),
            { wrapper, initialProps: { mods: ["HD"] } },
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        rerender({ mods: ["HD", "DT"] });
        await waitFor(() => expect(requests).toHaveLength(2));

        expect(requests.map((url) => url.searchParams.get("mods"))).toEqual(["HD", "HDDT"]);
    });
});
