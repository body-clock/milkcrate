import { Controller } from "@hotwired/stimulus"

// Manages the immersive crate-digging view: one record at a time, stack depth,
// swipe/arrow/button navigation. Flip is handled by the nested record-card controller.
export default class extends Controller {
  static targets = ["card", "counter", "prevBtn", "nextBtn"]

  connect() {
    this.index = 0
    this.touchStartX = 0
    this.updateStack()
    this.bindKeyboard()
  }

  disconnect() {
    document.removeEventListener("keydown", this._keyHandler)
  }

  next() {
    if (this.index >= this.cardTargets.length - 1) return
    this.unflipCurrent()
    this.index++
    this.updateStack()
  }

  prev() {
    if (this.index <= 0) return
    this.unflipCurrent()
    this.index--
    this.updateStack()
  }

  touchStart(event) {
    this.touchStartX = event.touches[0].clientX
  }

  touchEnd(event) {
    const delta = this.touchStartX - event.changedTouches[0].clientX
    if (Math.abs(delta) < 40) return // too small, treat as tap
    delta > 0 ? this.next() : this.prev()
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  updateStack() {
    const total = this.cardTargets.length

    this.cardTargets.forEach((card, i) => {
      const pos = i - this.index
      card.dataset.stackPos = pos

      // Only render positions 0 (current), 1, 2 (depth cards)
      if (pos < 0 || pos > 2) {
        card.style.display = "none"
      } else {
        card.style.display = ""
      }
    })

    if (this.hasCounterTarget) {
      this.counterTarget.textContent = `${this.index + 1} / ${total}`
    }

    if (this.hasPrevBtnTarget) {
      this.prevBtnTarget.disabled = this.index === 0
    }

    if (this.hasNextBtnTarget) {
      this.nextBtnTarget.disabled = this.index >= total - 1
    }
  }

  unflipCurrent() {
    const current = this.cardTargets[this.index]
    if (current) current.querySelector(".mc-record-card")?.classList.remove("flipped")
  }

  bindKeyboard() {
    this._keyHandler = (e) => {
      if (e.key === "ArrowRight") this.next()
      if (e.key === "ArrowLeft") this.prev()
    }
    document.addEventListener("keydown", this._keyHandler)
  }
}
