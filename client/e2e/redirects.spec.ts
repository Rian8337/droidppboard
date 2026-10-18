import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi";

test("an address of the old site ends at its new page", async ({ page }) => {
    await mockApi(page);
    await page.goto("/prototype/leaderboard/droid-rebalance");

    await expect(page).toHaveURL(/\/v\/droid-rebalance\/leaderboard$/);
    await expect(page.getByRole("link", { name: "Leaderboard" })).toHaveAttribute(
        "aria-current",
        "page",
    );
});
