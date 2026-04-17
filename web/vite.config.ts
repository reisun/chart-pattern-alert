/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  base: "/chart-pattern-alert/",
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.spec.ts"],
  },
});
