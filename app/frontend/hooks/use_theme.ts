import { useState, useEffect } from "react"

type Theme = "dark" | "light"

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark"
    const stored = localStorage.getItem("mc-theme")
    return stored === "light" ? "light" : "dark"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "")
    localStorage.setItem("mc-theme", theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return { theme, toggle }
}
