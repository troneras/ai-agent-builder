/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "node", // Use node environment for server-side testing
        setupFiles: [],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "dist/",
                "coverage/",
                "**/*.d.ts",
                "src/tests/**",
                "test-*.js",
                "supabase/functions/**/*.test.ts",
            ],
        },
    },
    resolve: {
        alias: {
            "@": "/src",
        },
    },
});
