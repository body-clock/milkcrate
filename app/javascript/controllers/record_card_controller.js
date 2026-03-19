import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  flip(event) {
    // Don't flip when clicking buttons/links inside the back face
    if (event.target.closest("a, button, form")) return
    this.element.classList.toggle("flipped")
  }

  stopPropagation(event) {
    // Prevent clicks on the back face from re-flipping
    event.stopPropagation()
  }
}
