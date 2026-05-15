---
date: 2026-05-15
topic: first-swipe-lesson
---

# First Swipe Lesson

## Summary

Add a compact first-use teaching layer for crate riffling: a subtle vertical cue that shows how to pull down to dig deeper, plus a minimal correction when users try familiar left/right card swipes. Once the user successfully learns the gesture, the lesson stays hidden for the rest of the browser session.

---

## Problem Frame

Milkcrate's crate view now has a clearer riffle contract: down means deeper into the crate, and up means back toward the front. That direction is intentionally physical, but it is also unusual on mobile because many users bring a Tinder-like expectation that cards move left and right.

The current guidance copy can state the rule, but first-time users should not have to read an instruction block before browsing. The teaching moment needs to be quiet, visual, and recover gracefully from the most likely wrong gesture without making the surface feel like a tutorial.

---

## Actors

- A1. First-time mobile crate browser: Opens a crate on a compact viewport and needs to discover how to riffle through records.
- A2. Returning same-session browser: Has already riffled successfully and should not keep seeing beginner guidance.
- A3. Horizontal-swipe browser: Tries to move through records with a left/right card swipe because that pattern is familiar.

---

## Key Flows

- F1. First-time user sees the vertical cue
  - **Trigger:** A1 opens a populated crate on a compact viewport without having learned the riffle gesture during the current browser session.
  - **Actors:** A1
  - **Steps:** The crate presents a tiny, unobtrusive visual cue that demonstrates a downward pull toward deeper records. The cue avoids blocking record art, controls, or ordinary browsing.
  - **Outcome:** The user can infer the vertical gesture before needing trial and error.
  - **Covered by:** R1, R2, R3

- F2. User learns the gesture
  - **Trigger:** A1 completes a successful vertical riffle.
  - **Actors:** A1, A2
  - **Steps:** The crate accepts the gesture, advances or returns according to the existing riffle contract, and marks the first-swipe lesson as learned for the rest of the browser session.
  - **Outcome:** The proactive lesson stays hidden across later crate browsing during that session.
  - **Covered by:** R4, R5, R6

- F3. User tries a horizontal card swipe
  - **Trigger:** A3 performs a mostly horizontal swipe that does not satisfy the vertical riffle contract.
  - **Actors:** A3
  - **Steps:** The crate does not navigate horizontally. If the lesson has not already been learned, it replays or re-emphasizes the vertical cue with little or no additional copy.
  - **Outcome:** The wrong gesture becomes a gentle redirect toward the vertical model, not an error state.
  - **Covered by:** R7, R8, R9

---

## Requirements

**Proactive lesson**
- R1. On compact populated crate views, first-time same-session users see a small visual cue that demonstrates pulling down to dig deeper.
- R2. The cue must be unobtrusive: it does not block the active record, obscure core controls, or require dismissal before browsing.
- R3. The cue should teach through motion or spatial behavior first, with visible text kept minimal and secondary.

**Session mastery**
- R4. A successful vertical riffle marks the lesson as learned for the rest of the browser session.
- R5. Once learned, the proactive cue remains hidden across crate changes and store browsing within that same session.
- R6. The lesson resets in a future browser session unless a later product decision adds durable preference storage.

**Horizontal-swipe recovery**
- R7. A mostly horizontal swipe must not navigate through the crate or compete with the down/up riffle model.
- R8. If an unlearned user attempts a mostly horizontal swipe, the crate re-shows or emphasizes the vertical cue instead of presenting a verbose explanation.
- R9. Horizontal-swipe recovery should feel like coaching, not scolding: no error styling, no modal, and no long instruction block.

**Compatibility**
- R10. The first-swipe lesson uses the existing down/deeper and up/front language from the riffle contract.
- R11. Reduced-motion users receive a non-animated or simplified lesson that still communicates the vertical direction.
- R12. Empty crates and non-compact layouts do not show the first-swipe lesson.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given a first-time same-session mobile user opens a populated crate, when the crate view appears, then a small vertical cue demonstrates pulling down without blocking the active record or controls.
- AE2. **Covers R4, R5.** Given the first-swipe lesson is visible, when the user completes a successful vertical riffle, then the lesson is marked learned and does not reappear when the user opens another crate during the same session.
- AE3. **Covers R7, R8, R9.** Given an unlearned mobile user swipes mostly left or right, when the gesture ends, then no record change occurs and the vertical cue is re-emphasized without an error message or modal.
- AE4. **Covers R10, R11.** Given reduced motion is enabled, when the first-swipe lesson appears, then it communicates the same down/deeper direction without relying on a looping animated gesture.
- AE5. **Covers R12.** Given the user opens an empty crate or a non-compact layout, when the crate view renders, then no first-swipe lesson appears.

---

## Success Criteria

- First-time mobile users can discover that pulling down digs deeper without reading a heavy instruction block.
- Users who try horizontal swiping are redirected toward the crate-specific vertical gesture without feeling corrected or interrupted.
- Returning same-session users are trusted: the lesson does not repeatedly consume attention after a successful riffle.
- A planner can implement the lesson without reopening the riffle direction contract or inventing new navigation semantics.

---

## Scope Boundaries

- The down/deeper and up/front riffle direction contract is already settled by `docs/brainstorms/2026-05-15-record-riffle-engine-requirements.md`.
- Rich sleeve physics, detents, pressure shadows, and commit pulses remain outside this lesson.
- A vertical crate spine, progress rail replacement, or broader orientation redesign remains outside this lesson.
- Durable cross-session preference storage is not part of this brief.
- Desktop and wide-layout gesture teaching is not part of this brief.
- Backend crate selection, inventory data, ranking, and store onboarding behavior are unchanged.

---

## Key Decisions

- Visual cue first: The lesson should feel like the crate showing its affordance, not like the product explaining itself.
- Horizontal swipes as recovery: Left/right attempts are expected enough to handle, but the response should reinforce vertical riffle rather than introduce a second gesture model.
- Session-level mastery: Once the user succeeds, the product should stay out of the way everywhere in the same session.
- Minimal copy: Existing riffle language can remain available, but the first-swipe lesson should not depend on a long sentence to work.

---

## Dependencies / Assumptions

- `app/frontend/components/crate_view.tsx` remains the crate browsing surface where compact riffle guidance appears.
- `app/frontend/lib/riffle_navigation.ts` remains the source of truth for down/deeper and up/front language and navigation semantics.
- Existing reduced-motion behavior remains available for any simplified lesson variant.
- The browser session is an acceptable boundary for remembering that the lesson has been learned.

---

## Outstanding Questions

### Resolve Before Planning

(None.)

### Deferred to Planning

- [Affects R1, R3][Design] What exact visual form best communicates the cue: a ghost sleeve pull, active-card nudge, control pulse, or another compact affordance?
- [Affects R4, R5][Technical] What is the simplest session-scoped storage point for learned state that avoids durable cross-session preference behavior?
