import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createQueryClient } from "../src/api/queryClient";
import { App } from "../src/App";

describe("App", () => {
    it("opens the droid-rebalance leaderboard in the shell", async () => {
        render(
            <QueryClientProvider client={createQueryClient({ retry: false })}>
                <App />
            </QueryClientProvider>,
        );

        expect(await screen.findByRole("heading", { name: "PP Board · Rebalance" })).toBeVisible();
    });
});
