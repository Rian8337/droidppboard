import { expect, test } from "@playwright/test";
import { plainMe } from "../tests/mocks/fixtures";
import { mockApi } from "./mockApi";

test("a queued player is waiting in the queue", async ({ page }) => {
    await mockApi(page, { me: plainMe });
    await page.goto("/v/droid-rebalance/queue");

    const queue = page.getByRole("region", { name: "Queue" });

    await expect(queue.getByText("The queue is empty.")).toBeVisible();

    await page.getByRole("textbox", { name: "Player name or ID" }).fill("Alpha");
    await page.getByRole("button", { name: "Add to queue" }).click();

    await expect(page.getByRole("status")).toHaveText("Added Alpha to the queue.");
    await expect(queue).toContainText("1 waiting");
    await expect(queue).toContainText("Alpha");
});
