import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { createQueryClient } from "../../src/api/queryClient";
import { useStartFullRun, useStopFullRun } from "../../src/api/recalc";
import { server } from "../mocks/server";

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={createQueryClient({ retry: false })}>
            {children}
        </QueryClientProvider>
    );
}

describe("useStartFullRun", () => {
    it("posts whether to restart to the variant's start route", async () => {
        const requests: { variant: string; body: unknown }[] = [];

        server.use(
            http.post("/api/recalc/full-runs/:variant/start", async ({ params, request }) => {
                requests.push({ variant: String(params.variant), body: await request.json() });

                return new HttpResponse(null, { status: 204 });
            }),
        );

        const { result } = renderHook(() => useStartFullRun(), { wrapper });

        result.current.mutate({ variant: "droid-rebalance", restart: true });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(requests).toEqual([{ variant: "droid-rebalance", body: { restart: true } }]);
    });

    it("reports why the server refused", async () => {
        server.use(
            http.post("/api/recalc/full-runs/:variant/start", () =>
                HttpResponse.json(
                    { message: "A full run of this rework is already running" },
                    { status: 409 },
                ),
            ),
        );

        const { result } = renderHook(() => useStartFullRun(), { wrapper });

        result.current.mutate({ variant: "droid-rebalance", restart: false });
        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error?.message).toBe("A full run of this rework is already running");
    });
});

describe("useStopFullRun", () => {
    it("posts to the variant's stop route", async () => {
        const stopped: string[] = [];

        server.use(
            http.post("/api/recalc/full-runs/:variant/stop", ({ params }) => {
                stopped.push(String(params.variant));

                return new HttpResponse(null, { status: 204 });
            }),
        );

        const { result } = renderHook(() => useStopFullRun(), { wrapper });

        result.current.mutate("reading");
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(stopped).toEqual(["reading"]);
    });
});
