// fallow-ignore-next-line unused-files — Vite entrypoint, loaded by vite-plugin-ruby
import { createInertiaApp, router } from "@inertiajs/react";
import type { ComponentType } from "react";
import { hydrateRoot } from "react-dom/client";

declare global {
  interface Window {
    plausible?: (eventName: string) => void;
  }
}

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob<{ default: ComponentType<any> }>("../pages/**/*.tsx");
    const page = pages[`../pages/${name}.tsx`] ?? pages[`../pages/${name}/index.tsx`];
    if (!page) {
      throw new Error(`Page not found: ${name}`);
    }
    return page().then((module) => module.default);
  },
  setup({ el, App, props }) {
    hydrateRoot(el, <App {...props} />);
  },
});

// Fire Plausible pageview on Inertia client-side navigations
router.on("navigate", () => {
  if (typeof window.plausible === "function") {
    window.plausible("pageview");
  }
});
