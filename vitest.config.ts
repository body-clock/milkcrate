import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app/frontend"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["app/frontend/test/setup.ts"],
    include: ["app/frontend/**/*.test.{ts,tsx}"],
    exclude: ["app/frontend/lib/*.test.ts"],
  },
})
