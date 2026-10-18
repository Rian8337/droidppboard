import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { AppRoutes } from "../../src/routing/routes";
import { droidCalculation } from "../mocks/fixtures";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

function serveSnapshot() {
    server.use(
        http.get("/api/ppboard/snapshots/:id", () =>
            HttpResponse.json({
                id: "abc1234567",
                createdAt: "2026-10-12T08:00:00.000Z",
                expiresAt: "2026-11-11T08:00:00.000Z",
                calculation: droidCalculation,
            }),
        ),
    );
}

describe("AppRoutes", () => {
    it("opens a variant's snapshot rather than a tab", async () => {
        serveSnapshot();
        renderWithProviders(<AppRoutes />, { route: "/v/droid-rebalance/calculator/s/abc1234567" });

        expect(await screen.findByText(/^Snapshot taken /)).toBeVisible();
    });

    it("opens the Beatmap calculator and its snapshots", async () => {
        renderWithProviders(<AppRoutes />, { route: "/calculate" });

        expect(await screen.findByLabelText("Variant")).toHaveValue("droid-live");
    });

    it("opens a Beatmap calculator snapshot", async () => {
        serveSnapshot();
        renderWithProviders(<AppRoutes />, { route: "/calculate/s/abc1234567" });

        expect(await screen.findByText(/^Snapshot taken /)).toBeVisible();
    });
});
