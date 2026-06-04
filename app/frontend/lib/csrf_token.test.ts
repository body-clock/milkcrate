import assert from "node:assert";
import { describe, it } from "node:test";

import { csrfToken } from "./csrf_token";

describe("csrfToken", () => {
  it("returns an empty string when document is not available", () => {
    const originalDocument = globalThis.document;

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: undefined,
    });

    try {
      assert.strictEqual(csrfToken(), "");
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    }
  });
});
