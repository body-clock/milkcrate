import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    const saved = localStorage.getItem("mc-theme")
    if (saved) document.documentElement.dataset.theme = saved
  }

  toggle() {
    const current = document.documentElement.dataset.theme
    const next = current === "light" ? "dark" : "light"
    document.documentElement.dataset.theme = next
    localStorage.setItem("mc-theme", next)
  }
}
