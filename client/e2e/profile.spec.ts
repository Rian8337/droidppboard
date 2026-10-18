import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi";

test("a profile opens from the leaderboard", async ({ page }, testInfo) => {
    // A phone lists players as links; wider screens as clickable rows.
    const isPhone = testInfo.project.name === "phone";

    await mockApi(page);
    await page.goto("/v/droid-rebalance/leaderboard");
    await page.getByRole(isPhone ? "link" : "row", { name: /Alpha/ }).click();

    await expect(page).toHaveURL(/\/v\/droid-rebalance\/players\/1000$/);
    await expect(page.getByRole("heading", { name: "Alpha", level: 2 })).toBeVisible();
    await expect(page.getByText("Alpha Song").first()).toBeVisible();
});
