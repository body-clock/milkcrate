import { describe, expect, it } from "vitest";
import { csrfToken } from "./csrf_token";

describe("csrfToken", () => {
  it("returns an empty string when document is not available", () => {
    const originalDocument = globalThis.document;

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: undefined,
    });

    try {
      expect(csrfToken()).toBe("");
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    }
  });
});
