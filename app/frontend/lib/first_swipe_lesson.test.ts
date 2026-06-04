import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRST_SWIPE_STORAGE_KEY,
  isLessonLearned,
  markLessonLearned,
  isLessonEligible,
  classifyDragAttempt,
} from "./first_swipe_lesson";

// ----- isLessonLearned / markLessonLearned -----

test("isLessonLearned returns false when no learned state has been stored", () => {
  sessionStorage.clear();
  assert.equal(isLessonLearned(), false);
});

test("isLessonLearned returns true after markLessonLearned is called", () => {
  sessionStorage.clear();
  markLessonLearned();
  assert.equal(isLessonLearned(), true);
});

test("learned state persists across separate calls in the same session", () => {
  sessionStorage.clear();
  assert.equal(isLessonLearned(), false);
  markLessonLearned();
  assert.equal(isLessonLearned(), true);
  // Re-read to confirm persistence
  assert.equal(isLessonLearned(), true);
});

test("markLessonLearned stores a known key in sessionStorage", () => {
  sessionStorage.clear();
  assert.equal(sessionStorage.getItem(FIRST_SWIPE_STORAGE_KEY), null);
  markLessonLearned();
  assert.equal(sessionStorage.getItem(FIRST_SWIPE_STORAGE_KEY), "1");
});

// ----- Storage unavailability -----

test("isLessonLearned returns false when sessionStorage.getItem throws", () => {
  sessionStorage.clear();
  const originalGetItem = sessionStorage.getItem.bind(sessionStorage);
  sessionStorage.getItem = () => {
    throw new Error("storage unavailable");
  };
  try {
    assert.equal(isLessonLearned(), false);
  } finally {
    sessionStorage.getItem = originalGetItem;
  }
});

test("markLessonLearned does not throw when sessionStorage.setItem fails", () => {
  sessionStorage.clear();
  const originalSetItem = sessionStorage.setItem.bind(sessionStorage);
  sessionStorage.setItem = () => {
    throw new Error("storage write failed");
  };
  try {
    assert.doesNotThrow(() => markLessonLearned());
  } finally {
    sessionStorage.setItem = originalSetItem;
  }
});

test("both helpers behave when sessionStorage is entirely absent", () => {
  const storage = globalThis as Record<string, unknown>;
  const saved = storage.sessionStorage;
  storage.sessionStorage = undefined;
  try {
    assert.equal(isLessonLearned(), false);
    assert.doesNotThrow(() => markLessonLearned());
  } finally {
    storage.sessionStorage = saved;
  }
});

// ----- isLessonEligible -----

test("isLessonEligible returns true for compact populated unlearned crate", () => {
  sessionStorage.clear();
  assert.equal(isLessonEligible({ isCompact: true, isPopulated: true }), true);
});

test("isLessonEligible returns false for non-compact tiers", () => {
  sessionStorage.clear();
  assert.equal(isLessonEligible({ isCompact: false, isPopulated: true }), false);
});

test("isLessonEligible returns false for compact empty crates", () => {
  sessionStorage.clear();
  assert.equal(isLessonEligible({ isCompact: true, isPopulated: false }), false);
});

test("isLessonEligible returns false after the lesson is learned", () => {
  sessionStorage.clear();
  markLessonLearned();
  assert.equal(isLessonEligible({ isCompact: true, isPopulated: true }), false);
});

test("isLessonEligible returns false when both parameters are false", () => {
  sessionStorage.clear();
  assert.equal(isLessonEligible({ isCompact: false, isPopulated: false }), false);
});

// ----- classifyDragAttempt -----

test("mostly horizontal swipe classifies as horizontal-recovery", () => {
  assert.equal(classifyDragAttempt({ offsetX: 120, offsetY: 20 }), "horizontal-recovery");
  assert.equal(classifyDragAttempt({ offsetX: -120, offsetY: -20 }), "horizontal-recovery");
});

test("small tap-like movements classify as none", () => {
  assert.equal(classifyDragAttempt({ offsetX: 5, offsetY: 2 }), "none");
  assert.equal(classifyDragAttempt({ offsetX: 8, offsetY: 6 }), "none");
  assert.equal(classifyDragAttempt({ offsetX: 0, offsetY: 0 }), "none");
});

test("vertical-dominant movement classifies as none (handled by riffle contract)", () => {
  assert.equal(classifyDragAttempt({ offsetX: 10, offsetY: 80 }), "none");
  assert.equal(classifyDragAttempt({ offsetX: 30, offsetY: 100 }), "none");
  assert.equal(classifyDragAttempt({ offsetX: 5, offsetY: -72 }), "none");
});

test("requires minimum horizontal distance to classify as horizontal-recovery", () => {
  // Horizontal-dominant but too small
  assert.equal(classifyDragAttempt({ offsetX: 25, offsetY: 10 }), "none");
  // Just above the minimum (30px)
  assert.equal(classifyDragAttempt({ offsetX: 30, offsetY: 10 }), "horizontal-recovery");
});

test("diagonal swipes where horizontal still dominates classify as horizontal-recovery", () => {
  assert.equal(classifyDragAttempt({ offsetX: 80, offsetY: 60 }), "horizontal-recovery");
});
