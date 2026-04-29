# Front Riffle Crate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-card crate prototype with a tactile front-riffle crate browsing surface while preserving tap-to-flip details and the existing `CratePresenter` prop contract.

**Architecture:** Keep server data unchanged. Add deterministic client-side crate window helpers, then render a physical sleeve stack around the existing `RecordCard`. `CrateView` owns browsing and drag state; `RecordCard` owns flip/details/pile behavior.

**Tech Stack:** Rails + Inertia React, TypeScript, React 19, existing CSS/Tailwind tokens, native pointer/Framer-compatible motion patterns already present in the UI.

---

## File Structure

- Create `app/frontend/lib/crate_window.ts`: pure helper for deriving visible sleeve positions around the active record.
- Create `app/frontend/lib/crate_window.test.ts`: Node test coverage for the helper using the built-in `node:test` runner.
- Modify `app/frontend/components/record_card.tsx`: add `resetKey`, `className`, and movement guard props so active records reset to the cover side and small drags do not accidentally flip.
- Modify `app/frontend/components/crate_view.tsx`: replace the single-card display with the front-riffle crate stack, two-axis drag direction handling, boundary resistance, crate-position indicator, and reduced-motion handling.
- Modify `package.json`: add a lightweight `test:frontend` script using Node's built-in test runner and `tsx` so helper behavior can be verified without introducing a full browser test stack.

---

### Task 1: Add Visible Crate Window Helper

**Files:**
- Create: `app/frontend/lib/crate_window.ts`
- Create: `app/frontend/lib/crate_window.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the frontend test script**

Edit `package.json` so the scripts section exists and includes this command:

```json
{
  "scripts": {
    "test:frontend": "node --test --import tsx app/frontend/lib/*.test.ts"
  }
}
```

Keep the existing dependencies and devDependencies unchanged.

- [ ] **Step 2: Install the test runner dependency if it is missing**

Run:

```bash
npm ls tsx
```

Expected if missing: npm exits non-zero and reports `(empty)` or missing `tsx`.

If missing, run:

```bash
npm install --save-dev tsx
```

Expected: `package.json` and `package-lock.json` update with `tsx`.

- [ ] **Step 3: Write the failing helper tests**

Create `app/frontend/lib/crate_window.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { buildCrateWindow } from "./crate_window"

type RecordStub = { id: number; title: string }

const records: RecordStub[] = [
  { id: 1, title: "one" },
  { id: 2, title: "two" },
  { id: 3, title: "three" },
  { id: 4, title: "four" },
  { id: 5, title: "five" },
]

test("buildCrateWindow centers the active record and includes nearby records", () => {
  const window = buildCrateWindow(records, 2, 2)

  assert.deepEqual(
    window.map((slot) => [slot.record.id, slot.offset, slot.isActive]),
    [
      [1, -2, false],
      [2, -1, false],
      [3, 0, true],
      [4, 1, false],
      [5, 2, false],
    ],
  )
})

test("buildCrateWindow clamps at the start of the crate", () => {
  const window = buildCrateWindow(records, 0, 2)

  assert.deepEqual(
    window.map((slot) => [slot.record.id, slot.offset, slot.isActive]),
    [
      [1, 0, true],
      [2, 1, false],
      [3, 2, false],
    ],
  )
})

test("buildCrateWindow clamps at the end of the crate", () => {
  const window = buildCrateWindow(records, 4, 2)

  assert.deepEqual(
    window.map((slot) => [slot.record.id, slot.offset, slot.isActive]),
    [
      [3, -2, false],
      [4, -1, false],
      [5, 0, true],
    ],
  )
})

test("buildCrateWindow handles an empty crate", () => {
  assert.deepEqual(buildCrateWindow([], 0, 2), [])
})
```

- [ ] **Step 4: Run the helper tests and verify failure**

Run:

```bash
npm run test:frontend
```

Expected: FAIL because `app/frontend/lib/crate_window.ts` does not exist or does not export `buildCrateWindow`.

- [ ] **Step 5: Implement the helper**

Create `app/frontend/lib/crate_window.ts`:

```ts
export interface CrateWindowSlot<TRecord> {
  record: TRecord
  index: number
  offset: number
  isActive: boolean
}

export function buildCrateWindow<TRecord>(
  records: TRecord[],
  activeIndex: number,
  radius = 2,
): CrateWindowSlot<TRecord>[] {
  if (records.length === 0) return []

  const clampedIndex = Math.min(Math.max(activeIndex, 0), records.length - 1)
  const start = Math.max(0, clampedIndex - radius)
  const end = Math.min(records.length - 1, clampedIndex + radius)

  const slots: CrateWindowSlot<TRecord>[] = []
  for (let index = start; index <= end; index += 1) {
    slots.push({
      record: records[index],
      index,
      offset: index - clampedIndex,
      isActive: index === clampedIndex,
    })
  }

  return slots
}
```

- [ ] **Step 6: Run the helper tests and verify pass**

Run:

```bash
npm run test:frontend
```

Expected: PASS for all four `crate_window` tests.

- [ ] **Step 7: Commit Task 1**

```bash
git add package.json package-lock.json app/frontend/lib/crate_window.ts app/frontend/lib/crate_window.test.ts
git commit -m "test: add crate window helper coverage"
```

---

### Task 2: Make RecordCard Resettable And Drag-Safe

**Files:**
- Modify: `app/frontend/components/record_card.tsx`

- [ ] **Step 1: Update the props interface**

Change the props block in `record_card.tsx` to:

```ts
interface Props {
  listing: Listing
  resetKey?: string | number
  className?: string
}
```

- [ ] **Step 2: Import `useEffect` and reset flip state**

Change the React import to:

```ts
import React, { useEffect, useRef, useState } from "react"
```

Then update the component signature and add refs/effect after the `flipped` state:

```ts
export default function RecordCard({ listing, resetKey, className = "" }: Props) {
  const [flipped, setFlipped] = useState(false)
  const pointerDown = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setFlipped(false)
  }, [resetKey])
```

- [ ] **Step 3: Add pointer movement tracking**

Add these handlers above `handleFlip`:

```ts
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDown.current = { x: e.clientX, y: e.clientY }
  }

  const movedSincePointerDown = (e: React.MouseEvent) => {
    if (!pointerDown.current) return false

    const deltaX = Math.abs(e.clientX - pointerDown.current.x)
    const deltaY = Math.abs(e.clientY - pointerDown.current.y)
    pointerDown.current = null

    return Math.hypot(deltaX, deltaY) > 8
  }
```

Update `handleFlip` to:

```ts
  const handleFlip = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button, form")) return
    if (movedSincePointerDown(e)) return
    setFlipped((f) => !f)
  }
```

- [ ] **Step 4: Apply the props to the root element**

Change the root `div` class and add pointer tracking:

```tsx
    <div
      className={`w-full h-full flex-shrink-0 cursor-pointer ${className}`}
      style={{ perspective: 800, touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onClick={handleFlip}
    >
```

- [ ] **Step 5: Run existing checks**

Run:

```bash
npm run test:frontend
```

Expected: PASS.

Run:

```bash
bin/rails zeitwerk:check
```

Expected: PASS with `Zeitwerk@... eager loaded successfully`.

- [ ] **Step 6: Commit Task 2**

```bash
git add app/frontend/components/record_card.tsx
git commit -m "feat: reset record card flip state"
```

---

### Task 3: Build The Front-Riffle Crate View

**Files:**
- Modify: `app/frontend/components/crate_view.tsx`

- [ ] **Step 1: Import the helper and motion utilities**

Update imports in `crate_view.tsx`:

```ts
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence, useMotionValue, useReducedMotion, useTransform } from "framer-motion"
import { buildCrateWindow } from "../lib/crate_window"
```

- [ ] **Step 2: Add constants for drag feel**

Replace `DRAG_THRESHOLD` with:

```ts
const DRAG_THRESHOLD = 72
const WINDOW_RADIUS = 2
```

- [ ] **Step 3: Add motion state after the `direction` ref**

Add:

```ts
  const prefersReducedMotion = useReducedMotion()
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const activeRotate = useTransform(dragX, [-120, 0, 120], [-8, 0, 8])
  const activeLift = useTransform(dragY, [-120, 0, 120], [-10, 0, 12])
```

- [ ] **Step 4: Derive the visible crate window**

Add after `usePreload(records, index)`:

```ts
  const visibleRecords = useMemo(
    () => buildCrateWindow(records, index, WINDOW_RADIUS),
    [records, index],
  )
```

- [ ] **Step 5: Add dominant-axis drag completion**

Replace `handleDragEnd` with:

```ts
  const handleDragEnd = useCallback((_: any, info: { offset: { x: number; y: number } }) => {
    const { x, y } = info.offset
    const dominantOffset = Math.abs(x) > Math.abs(y) ? x : y

    dragX.set(0)
    dragY.set(0)

    if (dominantOffset > DRAG_THRESHOLD) navigate(1)
    else if (dominantOffset < -DRAG_THRESHOLD) navigate(-1)
  }, [dragX, dragY, navigate])
```

- [ ] **Step 6: Replace the single-card display with the crate stack**

Replace the whole “Record display” block with:

```tsx
      <div className="relative flex items-center justify-center min-h-[390px] md:min-h-[470px] py-5 sm:py-7 select-none overflow-hidden">
        <div className="relative w-[min(88vw,390px)] h-[min(92vw,430px)]">
          <div
            className="absolute inset-x-2 bottom-2 h-[54%] rounded-b-lg border-x-4 border-b-4 border-mc-border bg-mc-bg-raised"
            aria-hidden="true"
          />
          <div
            className="absolute left-8 right-8 bottom-1 h-4 rounded-b bg-mc-border opacity-80"
            aria-hidden="true"
          />

          <AnimatePresence initial={false} custom={direction.current}>
            {visibleRecords.map((slot) => {
              const depth = Math.abs(slot.offset)
              const isBefore = slot.offset < 0
              const isAfter = slot.offset > 0
              const sleeveWidth = "min(76vw, 300px)"
              const sleeveHeight = "min(76vw, 300px)"
              const inactiveX = isBefore ? -28 - depth * 10 : 28 + depth * 10
              const inactiveY = 38 + depth * 12
              const inactiveRotate = isBefore ? -10 - depth * 2 : 10 + depth * 2
              const inactiveOpacity = 1 - depth * 0.18

              if (!slot.isActive) {
                return (
                  <motion.div
                    key={slot.record.id}
                    className="absolute left-1/2 top-8 rounded-lg overflow-hidden border border-mc-border bg-mc-bg-card shadow-lg"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: inactiveY + 16 }}
                    animate={{
                      x: `calc(-50% + ${inactiveX}px)`,
                      y: inactiveY,
                      rotate: inactiveRotate,
                      opacity: inactiveOpacity,
                      scale: 1 - depth * 0.045,
                      zIndex: 20 - depth,
                    }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: inactiveY + 20 }}
                    transition={ease}
                    style={{
                      width: sleeveWidth,
                      height: sleeveHeight,
                      pointerEvents: "none",
                    }}
                    aria-hidden="true"
                  >
                    {slot.record.cover_image_url ? (
                      <img src={slot.record.cover_image_url} alt="" className="w-full h-full object-cover opacity-80" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-mc-bg-raised text-mc-text-dim text-5xl">♪</div>
                    )}
                    <div className="absolute inset-y-0 left-0 w-5 bg-black/20" />
                  </motion.div>
                )
              }

              return (
                <motion.div
                  key={slot.record.id}
                  custom={direction.current}
                  variants={{
                    initial: (d: number) => prefersReducedMotion ? { opacity: 0 } : d >= 0 ? { opacity: 0, y: -52, scale: 0.96 } : { opacity: 0, y: 52, scale: 0.96 },
                    animate: { opacity: 1, x: "-50%", y: 0, rotate: 0, scale: 1 },
                    exit: (d: number) => prefersReducedMotion ? { opacity: 0 } : d >= 0 ? { opacity: 0, x: "-50%", y: 86, rotate: 9, scale: 0.95 } : { opacity: 0, x: "-50%", y: -62, rotate: -9, scale: 0.95 },
                  }}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={prefersReducedMotion ? ease : { type: "spring", stiffness: 280, damping: 28 }}
                  className="absolute left-1/2 top-4 rounded-lg overflow-hidden border border-mc-border shadow-2xl"
                  style={{
                    width: sleeveWidth,
                    height: sleeveHeight,
                    zIndex: 40,
                    x: "-50%",
                    rotate: prefersReducedMotion ? 0 : activeRotate,
                    y: prefersReducedMotion ? 0 : activeLift,
                    touchAction: "none",
                  }}
                  drag
                  dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
                  dragElastic={index <= 0 || index >= total - 1 ? 0.12 : 0.28}
                  whileDrag={prefersReducedMotion ? undefined : { scale: 1.03 }}
                  onDrag={(event, info) => {
                    dragX.set(info.offset.x)
                    dragY.set(info.offset.y)
                  }}
                  onDragEnd={handleDragEnd}
                >
                  <RecordCard listing={slot.record} resetKey={`${activeSlug}-${slot.record.id}`} />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
```

- [ ] **Step 7: Replace the progress bar copy with crate-position language**

Replace the progress block with:

```tsx
      <div className="w-full max-w-xs sm:max-w-sm mx-auto mb-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-mc-text-dim mb-2">
          <span>front of crate</span>
          <span>back</span>
        </div>
        <div className="h-2 bg-mc-bg-raised rounded-full overflow-hidden border border-mc-border">
          <motion.div
            className="h-full bg-mc-accent rounded-full"
            animate={{ width: `${progress}%` }}
            transition={ease}
          />
        </div>
      </div>
```

- [ ] **Step 8: Update the hint copy**

Replace the existing hint paragraph with:

```tsx
      <p className="text-center text-[10px] text-mc-text-dim mt-4 select-none">
        pull or push the sleeve to riffle &middot; tap cover for details &middot; ↓↑ keys
      </p>
```

- [ ] **Step 9: Run checks**

Run:

```bash
npm run test:frontend
```

Expected: PASS.

Run:

```bash
npm exec tsc -- --noEmit
```

Expected: PASS.

- [ ] **Step 10: Commit Task 3**

```bash
git add app/frontend/components/crate_view.tsx
git commit -m "feat: add front riffle crate browsing"
```

---

### Task 4: Browser Verification And Polish

**Files:**
- Modify as needed: `app/frontend/components/crate_view.tsx`
- Modify as needed: `app/frontend/components/record_card.tsx`

- [ ] **Step 1: Start the development server**

Run:

```bash
bin/dev
```

Expected: Rails/Vite dev server starts and serves the app locally.

- [ ] **Step 2: Verify desktop behavior**

Open the featured store page in the browser. Confirm:

- crate tabs and view toggle remain visible
- 3-5 sleeves appear as a physical stack
- active sleeve is centered and forward
- drag down/right advances
- drag up/left goes back
- releasing under threshold snaps back
- first and last records resist and clamp
- tap flips details
- pile and Discogs actions do not flip the card
- no text or controls overlap

- [ ] **Step 3: Verify mobile behavior**

Use a mobile-width viewport. Confirm:

- active sleeve fits within the viewport
- inactive sleeves do not push layout wider than the screen
- controls remain tappable
- flipped details remain readable
- hint text does not overlap controls

- [ ] **Step 4: Polish any layout problems found**

If sleeves are too large, reduce the `sleeveWidth` and `sleeveHeight` values in `crate_view.tsx`:

```ts
const sleeveWidth = "min(72vw, 286px)"
const sleeveHeight = "min(72vw, 286px)"
```

If inactive sleeves crowd the active sleeve, reduce the inactive offsets:

```ts
const inactiveX = isBefore ? -20 - depth * 8 : 20 + depth * 8
const inactiveY = 42 + depth * 10
```

If flipped details overflow, reduce `RecordCard` back padding from `p-4` to:

```tsx
<div className="flex flex-col h-full p-3 gap-2">
```

- [ ] **Step 5: Run final checks**

Run:

```bash
npm run test:frontend
npm exec tsc -- --noEmit
bin/rails zeitwerk:check
```

Expected: all checks pass.

- [ ] **Step 6: Commit Task 4**

```bash
git add app/frontend/components/crate_view.tsx app/frontend/components/record_card.tsx
git commit -m "polish: tune crate riffle layout"
```

---

## Self-Review

- Spec coverage: The plan keeps `CratePresenter` as the server contract, preserves tap-to-flip, adds a physical front-riffle surface, handles boundaries, resets crate switching, and includes reduced-motion behavior.
- Placeholder scan: No steps contain TBD/TODO/fill-in instructions. Every code-changing step includes concrete code.
- Type consistency: `buildCrateWindow`, `CrateWindowSlot`, `resetKey`, and `className` are named consistently across tasks.
