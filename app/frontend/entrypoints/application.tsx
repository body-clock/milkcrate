import { createInertiaApp, router } from "@inertiajs/react"
import { createRoot } from "react-dom/client"
import React from "react"

const pages = import.meta.glob<{ default: React.ComponentType<any> }>("../pages/**/*.tsx", { eager: true })

createInertiaApp({
  resolve: (name) => {
    return pages[`../pages/${name}.tsx`]
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
