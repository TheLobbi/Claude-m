/**
 * Unit tests for the Graph error translator.
 *
 * These tests are pure-logic — no network, no MSAL, no Graph SDK. They drive
 * the translator with synthesized error shapes that mirror what the SDK throws
 * in production, and assert the {code, recoveryHint, requiredScopes, ...} contract.
 */
import { describe, expect, it } from "vitest";
import { translateGraphError } from "../src/graph/errorTranslator.js";

describe("translateGraphError", () => {
  it("classifies 429 with Retry-After (seconds form)", () => {
    const err = {
      statusCode: 429,
      message: "Too many requests",
      headers: { "retry-after": "3" },
    };
    const t = translateGraphError(err);
    expect(t.code).toBe("tooManyRequests");
    expect(t.isRetryable).toBe(true);
    expect(t.retryAfterMs).toBe(3000);
    expect(t.recoveryHint).toContain("Wait 3s");
  });

  it("classifies 412 etag preconditionFailed as non-retryable", () => {
    const err = { statusCode: 412, message: "ETag mismatch" };
    const t = translateGraphError(err);
    expect(t.code).toBe("preconditionFailed");
    expect(t.isRetryable).toBe(false);
    expect(t.recoveryHint).toContain("Re-fetch the resource");
  });

  it("recognizes the OnlineMeetings app-access-policy 403 pattern", () => {
    const err = {
      statusCode: 403,
      message: "Forbidden — No application access policy found for this app",
    };
    const t = translateGraphError(err);
    expect(t.code).toBe("appAccessPolicyMissing");
    expect(t.recoveryHint).toContain("grant-meeting-access-policy.ps1");
    expect(t.isRetryable).toBe(false);
  });

  it("extracts required scopes from a 403 with permission names in the message", () => {
    const err = {
      statusCode: 403,
      message: "Insufficient privileges. Required scope: Tasks.ReadWrite.All",
    };
    const t = translateGraphError(err);
    expect(t.code).toBe("insufficientScope");
    expect(t.requiredScopes).toContain("Tasks.ReadWrite.All");
  });

  it("extracts required scope from WWW-Authenticate header", () => {
    const err = {
      statusCode: 403,
      message: "Forbidden",
      headers: { "www-authenticate": 'Bearer scope="Group.ReadWrite.All"' },
    };
    const t = translateGraphError(err);
    expect(t.code).toBe("insufficientScope");
    expect(t.requiredScopes).toContain("Group.ReadWrite.All");
  });

  it("classifies 404 as itemNotFound and non-retryable", () => {
    const err = { statusCode: 404, message: "Resource 'manager' does not exist" };
    const t = translateGraphError(err);
    expect(t.code).toBe("itemNotFound");
    expect(t.isRetryable).toBe(false);
  });

  it("classifies syncStateNotFound (delta-token expiry) on a 400", () => {
    const err = {
      statusCode: 400,
      message: "syncStateNotFound: token expired",
      code: "syncStateNotFound",
    };
    const t = translateGraphError(err);
    expect(t.code).toBe("syncStateNotFound");
    expect(t.recoveryHint).toContain("Restart the delta sync");
  });

  it("falls back to 'unknown' for unrecognized shapes", () => {
    const t = translateGraphError(new Error("something weird"));
    expect(t.code).toBe("unknown");
    expect(t.summary).toContain("something weird");
    expect(t.isRetryable).toBe(false);
  });

  it("attaches tool + mode context when provided", () => {
    const t = translateGraphError({ statusCode: 429, message: "throttled" }, { tool: "mail_listMessages", mode: "delegated" });
    expect(t.tool).toBe("mail_listMessages");
    expect(t.mode).toBe("delegated");
  });

  it("never throws on bare strings or undefined", () => {
    expect(() => translateGraphError("oops")).not.toThrow();
    expect(() => translateGraphError(undefined)).not.toThrow();
    const t = translateGraphError(undefined);
    expect(t.code).toBe("unknown");
  });
});
