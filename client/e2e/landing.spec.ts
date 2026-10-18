import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi";

test("the site opens on the leaderboard of droid-rebalance", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    await expect(page).toHaveURL(/\/v\/droid-rebalance\/leaderboard$/);
    await expect(
        page.getByRole("heading", { name: "PP Board · Rebalance", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Leaderboard" })).toHaveAttribute(
        "aria-current",
        "page",
    );
    await expect(page.getByText("Alpha")).toBeVisible();
    await expect(page.getByText("Bravo")).toBeVisible();
    await expect(page.getByText("Charlie")).toBeVisible();
});
