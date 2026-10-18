import type { ReactElement } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, type InitialEntry } from "react-router";
import type { Me } from "../../src/api/auth";
import { createQueryClient } from "../../src/api/queryClient";
import { server } from "../mocks/server";

export interface RenderWithProvidersOptions {
    /** The location to start at, with its navigation state if it has one. Defaults to `/`. */
    readonly route?: InitialEntry;

    /**
     * Who the mocked server says is logged in: a person, or `null` for nobody. Leave it out to use
     * whatever the handlers currently answer.
     */
    readonly me?: Me | null;
}

/**
 * Renders with a fresh query client that does not retry, a router at `route`, and the mocked
 * server answering `me` for `GET /api/auth/me`.
 */
export function renderWithProviders(
    ui: ReactElement,
    { route = "/", me }: RenderWithProvidersOptions = {},
): RenderResult {
    if (me !== undefined) {
        server.use(
            http.get("/api/auth/me", () =>
                me === null
                    ? HttpResponse.json({ message: "Not logged in" }, { status: 401 })
                    : HttpResponse.json(me),
            ),
        );
    }

    return render(
        <QueryClientProvider client={createQueryClient({ retry: false })}>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </QueryClientProvider>,
    );
}
