import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi";

test("switching variants through the sidebar or the drawer", async ({ page }, testInfo) => {
    const hasDrawer = testInfo.project.name !== "desktop";

    await mockApi(page);
    await page.goto("/");

    const sidebar = page.getByRole("complementary", { name: "Sidebar" });

    if (hasDrawer) {
        await expect(sidebar).toBeHidden();

        await page.getByRole("button", { name: "Open menu" }).click();
    }

    await expect(sidebar).toBeVisible();
    // The drawer slides in, so it is measured once it stops.
    await page.waitForFunction(() => document.getAnimations().length === 0);

    const viewport = page.viewportSize()!;
    const box = (await sidebar.boundingBox())!;

    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

    await sidebar.getByRole("link", { name: /Reading/ }).click();

    await expect(page).toHaveURL(/\/v\/reading\/leaderboard$/);
    await expect(page.getByRole("heading", { name: "PP Board · Reading", level: 1 })).toBeVisible();

    if (hasDrawer) {
        // Picking a variant closes the drawer.
        await expect(sidebar).toBeHidden();
        await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    } else {
        await expect(sidebar.getByRole("link", { name: /Reading/ })).toHaveAttribute(
            "aria-current",
            "true",
        );
    }
});
