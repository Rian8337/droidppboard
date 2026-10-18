import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi";

test("logging in returns to the page the person came from", async ({ page }) => {
    await mockApi(page);
    await page.goto("/v/reading/queue");
    await page.getByRole("link", { name: "Log in", exact: true }).click();

    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Username").fill("player");
    await page.getByLabel("Password").fill("secret");
    // The button waits for the captcha, which the mocked script solves.
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/v\/reading\/queue$/);
    await expect(page.getByRole("button", { name: "Add to queue" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in to queue players" })).toBeHidden();
});
