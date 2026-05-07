/**
 * Unit tests for the delta-token store. Uses a temp directory to avoid
 * polluting the real ~/.msgo-cache/delta/ on the dev machine.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tmpRoot: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "msgo-delta-test-"));
  process.env.MSGO_DELTA_DIR = tmpRoot;
});

afterAll(() => {
  if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
});

describe("deltaStore", () => {
  it("returns null when no token has been written", async () => {
    const { readDelta } = await import("../src/streaming/deltaStore.js");
    expect(readDelta("lobbi", "mail", "me_inbox")).toBeNull();
  });

  it("round-trips a deltaLink", async () => {
    const { writeDelta, readDelta } = await import("../src/streaming/deltaStore.js");
    const link = "https://graph.microsoft.com/v1.0/me/messages/delta?$deltatoken=abc";
    writeDelta("lobbi", "mail", "me_inbox", link);
    const got = readDelta("lobbi", "mail", "me_inbox");
    expect(got?.deltaLink).toBe(link);
    expect(got?.savedAt).toBeTruthy();
  });

  it("scopes tokens by tenantSlug + resource + scope", async () => {
    const { writeDelta, readDelta } = await import("../src/streaming/deltaStore.js");
    writeDelta("lobbi", "mail", "me_inbox", "L1");
    writeDelta("lobbi", "mail", "me_archive", "L2");
    writeDelta("client-acme", "mail", "me_inbox", "A1");
    expect(readDelta("lobbi", "mail", "me_inbox")?.deltaLink).toBe("L1");
    expect(readDelta("lobbi", "mail", "me_archive")?.deltaLink).toBe("L2");
    expect(readDelta("client-acme", "mail", "me_inbox")?.deltaLink).toBe("A1");
  });

  it("clearDelta removes a stored token", async () => {
    const { writeDelta, readDelta, clearDelta } = await import("../src/streaming/deltaStore.js");
    writeDelta("lobbi", "calendar", "me", "X");
    expect(readDelta("lobbi", "calendar", "me")).not.toBeNull();
    clearDelta("lobbi", "calendar", "me");
    expect(readDelta("lobbi", "calendar", "me")).toBeNull();
  });

  it("extractDeltaLink and extractNextLink read the right fields", async () => {
    const { extractDeltaLink, extractNextLink } = await import("../src/streaming/deltaStore.js");
    expect(extractDeltaLink({ "@odata.deltaLink": "D" })).toBe("D");
    expect(extractDeltaLink({ "@odata.nextLink": "N" })).toBeNull();
    expect(extractNextLink({ "@odata.nextLink": "N" })).toBe("N");
    expect(extractNextLink({})).toBeNull();
    expect(extractDeltaLink(null)).toBeNull();
  });
});
