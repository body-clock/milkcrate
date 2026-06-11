import createServer from "@inertiajs/react/server";
import type { ComponentType } from "react";
import ReactDOMServer from "react-dom/server";
import { createInertiaApp } from "@inertiajs/react";

createServer((page) =>
  createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) => {
      const pages = import.meta.glob<{ default: ComponentType<any> }>(
        "../pages/**/*.tsx",
      );
      const pageModule =
        pages[`../pages/${name}.tsx`] ??
        pages[`../pages/${name}/index.tsx`];
      if (!pageModule) {
        throw new Error(`Page not found: ${name}`);
      }
      return pageModule().then((mod) => mod.default);
    },
    setup: ({ App, props }) => <App {...props} />,
  }),
);
