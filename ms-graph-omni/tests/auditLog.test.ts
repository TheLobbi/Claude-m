/**
 * Unit tests for the audit-log fingerprint + write logic.
 *
 * Tests redaction (bodies elided, recipients hashed) and the isWriteTool gate.
 */
import { describe, expect, it } from "vitest";
import { fingerprintInput, hashPii, isWriteTool } from "../src/observability/auditLog.js";

describe("fingerprintInput", () => {
  it("redacts body content with a length marker", () => {
    const fp = fingerprintInput({ subject: "hi", body: "Lorem ipsum dolor sit amet, consectetur." });
    expect(fp.subject).toBe("hi");
    expect(fp.body).toMatch(/^\[redacted \d+ chars\]$/);
  });

  it("redacts attachments collection", () => {
    const fp = fingerprintInput({
      attachments: [
        { name: "x.pdf", contentBase64: "YQ==" },
        { name: "y.pdf", contentBase64: "Yg==" },
      ],
    });
    expect(fp.attachments).toBe("[2 attachments redacted]");
  });

  it("hashes recipient lists, preserving counts", () => {
    const fp = fingerprintInput({
      to: ["a@example.com", "b@example.com"],
      cc: ["c@example.com"],
    });
    expect(Array.isArray(fp.to)).toBe(true);
    expect((fp.to as string[]).length).toBe(2);
    expect((fp.to as string[])[0]).toMatch(/^sha:[0-9a-f]{12}$/);
    expect((fp.cc as string[])[0]).toBe(`sha:${hashPii("c@example.com")}`);
  });

  it("preserves identifier-shaped string fields", () => {
    const fp = fingerprintInput({ messageId: "AAMkABCDEF", folderId: "inbox" });
    expect(fp.messageId).toBe("AAMkABCDEF");
    expect(fp.folderId).toBe("inbox");
  });

  it("collapses long strings to length markers", () => {
    const fp = fingerprintInput({ blob: "x".repeat(500) });
    expect(fp.blob).toBe("[string len=500]");
  });

  it("handles primitives and undefined input", () => {
    expect(fingerprintInput("hello")._).toBe("string");
    expect(fingerprintInput(undefined)._).toBe("undefined");
  });
});

describe("isWriteTool", () => {
  it("returns false for explicit readOnlyHint", () => {
    expect(isWriteTool({ readOnlyHint: true })).toBe(false);
  });
  it("returns true for destructive tools", () => {
    expect(isWriteTool({ destructiveHint: true })).toBe(true);
  });
  it("returns true for idempotent updates", () => {
    expect(isWriteTool({ idempotentHint: true })).toBe(true);
  });
  it("defaults to true (audit on the safe side) when annotations are missing", () => {
    expect(isWriteTool(undefined)).toBe(true);
  });
});
