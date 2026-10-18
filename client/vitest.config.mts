import { defineConfig } from "vitest/config";
import { readAppVersion } from "./appVersion.ts";

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(readAppVersion()),
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.{test,spec}.{ts,tsx}"],
        globals: true,
        passWithNoTests: true,
    },
});
