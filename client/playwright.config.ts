import { defineConfig, devices } from "@playwright/test";

const port = 4173;

export default defineConfig({
    testDir: "./e2e",
    // The machine starves with more than one worker.
    workers: 1,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: `http://localhost:${port}`,
        trace: "retain-on-failure",
    },
    projects: [
        {
            name: "desktop",
            use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
        },
        {
            name: "tablet",
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 768, height: 1024 },
                hasTouch: true,
            },
        },
        {
            name: "phone",
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 390, height: 844 },
                hasTouch: true,
            },
        },
    ],
    webServer: {
        // The production build, made with the e2e mode so that the login page has a captcha site key.
        command: `pnpm exec vite build --mode e2e --outDir dist-e2e --emptyOutDir && pnpm exec vite preview --mode e2e --outDir dist-e2e --port ${port} --strictPort`,
        url: `http://localhost:${port}`,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
    },
});
