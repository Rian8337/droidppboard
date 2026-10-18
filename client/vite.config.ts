import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { readAppVersion } from "./appVersion.ts";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), babel({ include: /\.tsx$/, presets: [reactCompilerPreset()] })],
    define: {
        __APP_VERSION__: JSON.stringify(readAppVersion()),
    },
    server: {
        proxy: {
            "/api": "http://localhost:3001",
        },
    },
});
