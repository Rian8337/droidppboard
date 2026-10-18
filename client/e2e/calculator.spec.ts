import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi";

test("calculating by beatmap ID shows the difference from live", async ({ page }) => {
    await mockApi(page);
    await page.goto("/v/droid-rebalance/calculator");

    await page.getByLabel("Beatmap link or ID").fill("1234");
    await page.getByRole("button", { name: "Calculate" }).click();

    const result = page.getByRole("article", { name: "Calculation result" });

    await expect(result.getByText("Difference")).toBeVisible();
    await expect(result.getByText("+21.333")).toBeVisible();
    await expect(result.getByText("Total pp")).toBeVisible();
});
