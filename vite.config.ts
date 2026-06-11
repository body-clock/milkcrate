import path from "path";

import inertia from "@inertiajs/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import RubyPlugin from "vite-plugin-ruby";

export default defineConfig({
  plugins: [inertia(), RubyPlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app/frontend"),
    },
  },
  optimizeDeps: {
    include: ["framer-motion"],
  },
});
