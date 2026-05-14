import { createInertiaApp, router } from "@inertiajs/react"
import { createRoot } from "react-dom/client"
import React from "react"

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob<{ default: React.ComponentType<any> }>("../pages/**/*.tsx")
    const page = pages[`../pages/${name}.tsx`]
    if (!page) {
      throw new Error(`Page not found: ${name}`)
    }
    return page()
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})

// Fire Plausible pageview on Inertia client-side navigations
router.on("navigate", () => {
  if (typeof window.plausible === "function") {
    window.plausible("pageview")
  }
})
